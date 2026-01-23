from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer with nested user and account data - frontend compatible"""
    triggered_by_user = serializers.SerializerMethodField()
    triggeredBy = serializers.IntegerField(source='triggered_by.id', read_only=True, allow_null=True)
    account_name = serializers.SerializerMethodField()
    accountName = serializers.CharField(source='account.name', read_only=True, allow_null=True)
    accountId = serializers.IntegerField(source='account.id', read_only=True, allow_null=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 
            'account', 'accountId', 'account_name', 'accountName',
            'triggered_by', 'triggeredBy', 'triggered_by_user', 
            'read', 'read_at', 'timestamp',
            'data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'read_at', 'timestamp']
    
    def get_triggered_by_user(self, obj):
        """Get triggered by user info"""
        if obj.triggered_by:
            return {
                'id': obj.triggered_by.id,
                'username': obj.triggered_by.username,
                'email': obj.triggered_by.email,
            }
        return None
    
    def get_account_name(self, obj):
        """Get account name"""
        if obj.account:
            return obj.account.name
        return None


class NotificationReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read"""
    read = serializers.BooleanField(default=True)
