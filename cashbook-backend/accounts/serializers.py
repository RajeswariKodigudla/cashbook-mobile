from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Account, AccountMember


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested representations"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = fields


class AccountMemberSerializer(serializers.ModelSerializer):
    """Account member serializer with user details - frontend compatible"""
    user = UserBasicSerializer(read_only=True)
    invited_by_user = UserBasicSerializer(read_only=True, source='invited_by')
    accountId = serializers.IntegerField(source='account.id', read_only=True)
    accountName = serializers.CharField(source='account.name', read_only=True)
    userId = serializers.IntegerField(source='user.id', read_only=True)
    invitedBy = serializers.IntegerField(source='invited_by.id', read_only=True, allow_null=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = AccountMember
        fields = [
            'id', 'accountId', 'accountName', 'user', 'userId', 'status',
            'can_add_entry', 'can_edit_own_entry', 'can_edit_all_entries',
            'can_delete_entry', 'can_view_reports', 'can_manage_members',
            'invited_by', 'invitedBy', 'invited_by_user',
            'invited_at', 'accepted_at', 'created_at', 'updated_at',
            'permissions'
        ]
        read_only_fields = ['id', 'invited_at', 'accepted_at', 'created_at', 'updated_at']
    
    def get_permissions(self, obj):
        """Get permissions as object"""
        return {
            'can_add_entry': obj.can_add_entry,
            'can_edit_own_entry': obj.can_edit_own_entry,
            'can_edit_all_entries': obj.can_edit_all_entries,
            'can_delete_entry': obj.can_delete_entry,
            'can_view_reports': obj.can_view_reports,
            'can_manage_members': obj.can_manage_members,
        }


class AccountMemberPermissionsSerializer(serializers.Serializer):
    """Serializer for updating member permissions"""
    can_add_entry = serializers.BooleanField(required=False)
    can_edit_own_entry = serializers.BooleanField(required=False)
    can_edit_all_entries = serializers.BooleanField(required=False)
    can_delete_entry = serializers.BooleanField(required=False)
    can_view_reports = serializers.BooleanField(required=False)
    can_manage_members = serializers.BooleanField(required=False)


class AccountSerializer(serializers.ModelSerializer):
    """Account serializer with owner and member info - frontend compatible"""
    owner = UserBasicSerializer(read_only=True)
    accountName = serializers.CharField(source='name', read_only=True)  # Frontend compatibility
    ownerId = serializers.IntegerField(source='owner.id', read_only=True)  # Frontend compatibility
    member_count = serializers.SerializerMethodField()
    current_user_membership = serializers.SerializerMethodField()
    
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'accountName', 'type', 'description', 'owner', 'ownerId',
            'member_count', 'current_user_membership',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'accountName', 'ownerId']
    
    def get_member_count(self, obj):
        """Get count of accepted members (includes owner who is also a member)"""
        try:
            from .models import AccountMember
            # Count all ACCEPTED members (owner is also created as ACCEPTED member)
            count = AccountMember.objects.filter(account=obj, status='ACCEPTED').count()
            # Ensure owner is counted (they should be in AccountMember, but double-check)
            # If owner is not in AccountMember (shouldn't happen, but safety check), add 1
            owner_is_member = AccountMember.objects.filter(
                account=obj, 
                user=obj.owner, 
                status='ACCEPTED'
            ).exists()
            if not owner_is_member and count == 0:
                # Owner should always be counted, even if not in AccountMember table yet
                return 1
            return count
        except Exception as e:
            # Fallback: at minimum, owner should be counted
            return 1
    
    def get_current_user_membership(self, obj):
        """Get current user's membership status"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                from .models import AccountMember
                membership = AccountMember.objects.get(
                    account=obj,
                    user=request.user
                )
                return AccountMemberSerializer(membership).data
            except:
                return None
        return None


class AccountCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating accounts - optimized and flexible"""
    accountName = serializers.CharField(source='name', required=False, allow_blank=True)
    name = serializers.CharField(required=False, allow_blank=True)
    type = serializers.ChoiceField(choices=Account.ACCOUNT_TYPES, default='PERSONAL', required=False)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    
    class Meta:
        model = Account
        fields = ['name', 'accountName', 'type', 'description']
    
    def validate(self, attrs):
        """Ensure name is provided (either name or accountName)"""
        name = attrs.get('name') or attrs.get('accountName')
        if not name or not name.strip():
            raise serializers.ValidationError({
                'name': 'Account name is required'
            })
        attrs['name'] = name.strip()
        # Remove accountName if it was used
        attrs.pop('accountName', None)
        return attrs
    
    def create(self, validated_data):
        """Create account with current user as owner"""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class AccountInviteSerializer(serializers.Serializer):
    """Serializer for inviting members - supports email, username, user_id, or mobile"""
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    user_id = serializers.IntegerField(required=False)
    mobile = serializers.CharField(required=False, max_length=20)  # Mobile number support
    permissions = AccountMemberPermissionsSerializer(required=False)
    
    def validate(self, attrs):
        """Ensure at least one identifier is provided"""
        if not any([attrs.get('email'), attrs.get('username'), attrs.get('user_id'), attrs.get('mobile')]):
            raise serializers.ValidationError(
                "Must provide either email, username, user_id, or mobile number"
            )
        return attrs
