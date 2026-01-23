from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Notification
from .serializers import NotificationSerializer, NotificationReadSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Enterprise-level notification management with pagination and filtering
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """Override list to return proper response format"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to return proper response format"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def get_queryset(self):
        """Get notifications for current user with optimized query"""
        queryset = Notification.objects.filter(
            user=self.request.user
        ).select_related(
            'triggered_by', 'account'
        ).order_by('-created_at')
        
        # Filter by read status
        read_status = self.request.query_params.get('read', None)
        if read_status is not None:
            read_status = read_status.lower() == 'true'
            queryset = queryset.filter(read=read_status)
        
        # Filter by type
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        # Filter by account
        account_id = self.request.query_params.get('account', None)
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        return queryset
    
    @swagger_auto_schema(
        operation_description="Mark notification as read",
        request_body=NotificationReadSerializer,
        responses={200: NotificationSerializer}
    )
    @action(detail=True, methods=['put'], url_path='read')
    def mark_read(self, request, pk=None):
        """Mark notification as read/unread"""
        notification = self.get_object()
        serializer = NotificationReadSerializer(data=request.data)
        
        if serializer.is_valid():
            read = serializer.validated_data.get('read', True)
            if read:
                notification.mark_as_read()
            else:
                notification.mark_as_unread()
            
            return Response(
                {
                    'success': True,
                    'message': f'Notification marked as {"read" if read else "unread"}',
                    'data': NotificationSerializer(notification).data
                }
            )
        
        return Response(
            {'success': False, 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @swagger_auto_schema(
        operation_description="Mark all notifications as read",
        responses={200: openapi.Response('Success', schema=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'message': openapi.Schema(type=openapi.TYPE_STRING),
                'count': openapi.Schema(type=openapi.TYPE_INTEGER),
            }
        ))}
    )
    @action(detail=False, methods=['put'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all user notifications as read"""
        count = Notification.objects.filter(
            user=request.user,
            read=False
        ).update(
            read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'success': True,
            'message': f'{count} notifications marked as read',
            'count': count
        })
    
    @swagger_auto_schema(
        operation_description="Get unread notification count",
        responses={200: openapi.Response('Success', schema=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'count': openapi.Schema(type=openapi.TYPE_INTEGER),
            }
        ))}
    )
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(
            user=request.user,
            read=False
        ).count()
        
        return Response({
            'success': True,
            'count': count
        })
