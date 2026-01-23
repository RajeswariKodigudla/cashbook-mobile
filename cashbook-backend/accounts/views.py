from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Account, AccountMember
from .serializers import (
    AccountSerializer, AccountCreateSerializer,
    AccountMemberSerializer, AccountMemberPermissionsSerializer,
    AccountInviteSerializer
)

# Lazy import for NotificationService to avoid circular imports
def get_notification_service():
    """Lazy import of NotificationService"""
    from notifications.services import NotificationService
    return NotificationService


class AccountViewSet(viewsets.ModelViewSet):
    """
    Enterprise-level account management with proper permissions
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AccountCreateSerializer
        return AccountSerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to return proper response format"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to return proper response format"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        """Override update to return proper response format"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'success': True,
            'message': 'Account updated successfully',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to return proper response format"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'success': True,
            'message': 'Account deleted successfully'
        }, status=status.HTTP_200_OK)
    
    def create(self, request, *args, **kwargs):
        """Override create to return proper response format"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = self.perform_create(serializer)
        serializer = AccountSerializer(account, context={'request': request})
        headers = self.get_success_headers(serializer.data)
        return Response({
            'success': True,
            'message': 'Account created successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self):
        """Optimized queryset - get accounts where user is owner or member"""
        user = self.request.user
        from .models import AccountMember
        
        # Single optimized query using subquery for better performance
        member_account_ids = AccountMember.objects.filter(
            user=user,
            status='ACCEPTED'
        ).values_list('account_id', flat=True)
        
        # Use select_related for owner and prefetch for members
        return Account.objects.filter(
            Q(owner=user) | Q(id__in=member_account_ids)
        ).distinct().select_related('owner').only(
            'id', 'name', 'type', 'description', 'owner_id', 'created_at', 'updated_at'
        )
    
    def perform_create(self, serializer):
        """Create account and add owner as member - optimized"""
        account = serializer.save()
        # Create owner membership in single operation
        AccountMember.objects.create(
            account=account,
            user=account.owner,
            status='ACCEPTED',
            can_add_entry=True,
            can_edit_own_entry=True,
            can_edit_all_entries=True,
            can_delete_entry=True,
            can_view_reports=True,
            can_manage_members=True,
        )
        
        # Return proper response format
        return account
    
    def perform_destroy(self, instance):
        """Only owner can delete account"""
        if not instance.is_owner(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only account owner can delete account")
        super().perform_destroy(instance)
    
    @swagger_auto_schema(
        operation_description="Get account members",
        responses={200: AccountMemberSerializer(many=True)}
    )
    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, pk=None):
        """Get all members of an account - optimized query"""
        account = self.get_object()
        from .models import AccountMember
        
        # Check if user has access - optimized single query
        has_access = (
            account.is_owner(request.user) or
            AccountMember.objects.filter(
                account=account,
                user=request.user,
                status='ACCEPTED'
            ).exists()
        )
        
        if not has_access:
            return Response(
                {'success': False, 'message': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Optimized query with select_related
        members = AccountMember.objects.filter(
            account=account
        ).select_related('user', 'invited_by', 'account').only(
            'id', 'status', 'can_add_entry', 'can_edit_own_entry',
            'can_edit_all_entries', 'can_delete_entry', 'can_view_reports',
            'can_manage_members', 'invited_at', 'accepted_at',
            'user__id', 'user__username', 'user__email',
            'invited_by__id', 'invited_by__username',
            'account__id', 'account__name'
        )
        
        serializer = AccountMemberSerializer(members, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })
    
    @swagger_auto_schema(
        operation_description="Invite member to account",
        request_body=AccountInviteSerializer,
        responses={201: AccountMemberSerializer}
    )
    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        """Invite a user to the account"""
        account = self.get_object()
        
        # Check permissions
        from .models import AccountMember
        if not account.is_owner(request.user):
            membership = AccountMember.objects.filter(
                account=account,
                user=request.user, status='ACCEPTED'
            ).first()
            if not membership or not membership.can_manage_members:
                return Response(
                    {'success': False, 'message': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = AccountInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find user
        user = None
        data = serializer.validated_data
        
        if data.get('user_id'):
            try:
                user = User.objects.get(id=data['user_id'])
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'message': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif data.get('username'):
            try:
                user = User.objects.get(username=data['username'])
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'message': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif data.get('email'):
            try:
                user = User.objects.get(email=data['email'])
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'message': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif data.get('mobile'):
            # Try to find user by mobile number
            # Note: This assumes you have a UserProfile model with mobile field
            # If not, you can store mobile in User model or use a custom field
            try:
                # Try to find by username if mobile is stored as username
                user = User.objects.filter(username=data['mobile']).first()
                # Or if you have a UserProfile model:
                # from django.contrib.auth.models import User
                # user = User.objects.filter(userprofile__mobile=data['mobile']).first()
                if not user:
                    return Response(
                        {'success': False, 'message': 'User not found with this mobile number'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            except Exception as e:
                return Response(
                    {'success': False, 'message': f'Error finding user: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if not user:
            return Response(
                {'success': False, 'message': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already a member
        existing = AccountMember.objects.filter(account=account, user=user).first()
        if existing:
            if existing.status == 'ACCEPTED':
                return Response(
                    {'success': False, 'message': 'User is already a member'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif existing.status == 'PENDING':
                return Response(
                    {'success': False, 'message': 'Invitation already pending'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create or update membership
        permissions = data.get('permissions', {})
        member, created = AccountMember.objects.update_or_create(
            account=account,
            user=user,
            defaults={
                'status': 'PENDING',
                'invited_by': request.user,
                'can_add_entry': permissions.get('can_add_entry', True),
                'can_edit_own_entry': permissions.get('can_edit_own_entry', True),
                'can_edit_all_entries': permissions.get('can_edit_all_entries', False),
                'can_delete_entry': permissions.get('can_delete_entry', False),
                'can_view_reports': permissions.get('can_view_reports', True),
                'can_manage_members': permissions.get('can_manage_members', False),
            }
        )
        
        # Create notification
        NotificationService = get_notification_service()
        NotificationService.create_notification(
            user=user,
            notification_type='INVITATION',
            title=f'Invitation to {account.name}',
            message=f'{request.user.username} invited you to join {account.name}',
            triggered_by=request.user,
            account=account,
            data={'account_id': account.id, 'account_name': account.name}
        )
        
        return Response({
            'success': True,
            'message': 'Invitation sent',
            'data': AccountMemberSerializer(member).data
        }, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="Update member permissions",
        request_body=AccountMemberPermissionsSerializer,
        responses={200: AccountMemberSerializer}
    )
    @action(detail=True, methods=['put'], url_path='members/(?P<member_id>[^/.]+)/permissions')
    def update_permissions(self, request, pk=None, member_id=None):
        """Update member permissions"""
        account = self.get_object()
        
        # Check permissions
        if not account.is_owner(request.user):
            return Response(
                {'success': False, 'message': 'Only owner can update permissions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            member = AccountMember.objects.get(account=account, id=member_id)
        except AccountMember.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AccountMemberPermissionsSerializer(data=request.data)
        if serializer.is_valid():
            for key, value in serializer.validated_data.items():
                setattr(member, key, value)
            member.save()
            
            # Notify member
            NotificationService = get_notification_service()
            NotificationService.create_notification(
                user=member.user,
                notification_type='PERMISSION_CHANGED',
                title=f'Permissions updated for {account.name}',
                message=f'Your permissions for {account.name} have been updated',
                triggered_by=request.user,
                account=account
            )
            
            return Response({
                'success': True,
                'message': 'Permissions updated',
                'data': AccountMemberSerializer(member).data
            })
        
        return Response(
            {'success': False, 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @swagger_auto_schema(
        operation_description="Remove member from account",
        responses={200: openapi.Response('Success')}
    )
    @action(detail=True, methods=['delete'], url_path='members/(?P<member_id>[^/.]+)')
    def remove_member(self, request, pk=None, member_id=None):
        """Remove member from account"""
        account = self.get_object()
        
        # Check permissions
        if not account.is_owner(request.user):
            return Response(
                {'success': False, 'message': 'Only owner can remove members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            member = AccountMember.objects.get(account=account, id=member_id)
        except AccountMember.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Can't remove owner
        if member.user_id == account.owner_id:
            return Response(
                {'success': False, 'message': 'Cannot remove account owner'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = member.user
        member.delete()
        
        # Notify removed user
        NotificationService = get_notification_service()
        NotificationService.create_notification(
            user=user,
            notification_type='MEMBER_REMOVED',
            title=f'Removed from {account.name}',
            message=f'You have been removed from {account.name}',
            triggered_by=request.user,
            account=account
        )
        
        return Response({
            'success': True,
            'message': 'Member removed'
        })
    
    @swagger_auto_schema(
        operation_description="Transfer account ownership",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['newOwnerId'],
            properties={
                'newOwnerId': openapi.Schema(type=openapi.TYPE_INTEGER)
            }
        ),
        responses={200: AccountSerializer}
    )
    @action(detail=True, methods=['post'], url_path='transfer-ownership')
    def transfer_ownership(self, request, pk=None):
        """Transfer account ownership"""
        account = self.get_object()
        
        # Only owner can transfer
        if not account.is_owner(request.user):
            return Response(
                {'success': False, 'message': 'Only owner can transfer ownership'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_owner_id = request.data.get('newOwnerId')
        if not new_owner_id:
            return Response(
                {'success': False, 'message': 'newOwnerId is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_owner = User.objects.get(id=new_owner_id)
        except User.DoesNotExist:
            return Response(
                {'success': False, 'message': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if new owner is a member
        from .models import AccountMember
        member = AccountMember.objects.filter(account=account, user=new_owner, status='ACCEPTED').first()
        if not member:
            return Response(
                {'success': False, 'message': 'New owner must be an accepted member'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Transfer ownership
        old_owner = account.owner
        account.owner = new_owner
        account.save()
        
        # Update permissions
        member.can_manage_members = True
        member.can_edit_all_entries = True
        member.can_delete_entry = True
        member.save()
        
        # Update old owner permissions
        from .models import AccountMember
        old_owner_member = AccountMember.objects.filter(account=account, user=old_owner).first()
        if old_owner_member:
            old_owner_member.can_manage_members = False
            old_owner_member.save()
        
        # Notify both users
        NotificationService = get_notification_service()
        NotificationService.create_notification(
            user=new_owner,
            notification_type='ACCOUNT_UPDATED',
            title=f'Ownership transferred for {account.name}',
            message=f'You are now the owner of {account.name}',
            triggered_by=request.user,
            account=account
        )
        
        NotificationService.create_notification(
            user=old_owner,
            notification_type='ACCOUNT_UPDATED',
            title=f'Ownership transferred for {account.name}',
            message=f'{new_owner.username} is now the owner of {account.name}',
            triggered_by=request.user,
            account=account
        )
        
        return Response({
            'success': True,
            'message': 'Ownership transferred',
            'data': AccountSerializer(account, context={'request': request}).data
        })


class AccountInvitationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Handle account invitations - supports GET for list
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AccountMemberSerializer
    
    def get_queryset(self):
        """Get pending invitations for current user"""
        from .models import AccountMember
        return AccountMember.objects.filter(
            user=self.request.user,
            status='PENDING'
        ).select_related('account', 'invited_by', 'account__owner')
    
    @swagger_auto_schema(
        operation_description="Get pending invitations for current user",
        responses={200: AccountMemberSerializer(many=True)}
    )
    def list(self, request):
        """Get all pending invitations for current user - optimized"""
        queryset = self.get_queryset().only(
            'id', 'status', 'can_add_entry', 'can_edit_own_entry',
            'can_edit_all_entries', 'can_delete_entry', 'can_view_reports',
            'can_manage_members', 'invited_at', 'accepted_at',
            'user__id', 'user__username', 'user__email',
            'invited_by__id', 'invited_by__username',
            'account__id', 'account__name', 'account__owner__id'
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })
    
    @swagger_auto_schema(
        operation_description="Accept invitation",
        responses={200: AccountMemberSerializer}
    )
    def get_object(self):
        """Get invitation object"""
        from .models import AccountMember
        from rest_framework.exceptions import NotFound
        try:
            invitation = AccountMember.objects.get(
                id=self.kwargs['pk'],
                user=self.request.user,
                status='PENDING'
            )
            return invitation
        except AccountMember.DoesNotExist:
            raise NotFound('Invitation not found')
    
    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """Accept invitation"""
        invitation = self.get_object()
        invitation.accept()
        
        # Notify account owner and members
        NotificationService = get_notification_service()
        NotificationService.create_notification(
            user=invitation.account.owner,
            notification_type='INVITATION_ACCEPTED',
            title=f'{request.user.username} accepted invitation',
            message=f'{request.user.username} accepted invitation to {invitation.account.name}',
            triggered_by=request.user,
            account=invitation.account
        )
        
        # Notify all members
        NotificationService.notify_account_members(
            account=invitation.account,
            notification_type='INVITATION_ACCEPTED',
            title=f'New member joined {invitation.account.name}',
            message=f'{request.user.username} joined {invitation.account.name}',
            triggered_by=request.user,
            exclude_user=request.user
        )
        
        return Response({
            'success': True,
            'message': 'Invitation accepted',
            'data': self.get_serializer(invitation).data
        })
    
    @swagger_auto_schema(
        operation_description="Reject invitation",
        responses={200: openapi.Response('Success')}
    )
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject invitation"""
        invitation = self.get_object()
        invitation.reject()
        
        return Response({
            'success': True,
            'message': 'Invitation rejected'
        })
