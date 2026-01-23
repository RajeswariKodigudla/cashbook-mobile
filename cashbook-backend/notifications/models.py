from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Notification(models.Model):
    """Enterprise-level notification system with proper indexing and performance"""
    
    NOTIFICATION_TYPES = [
        ('INVITATION', 'Invitation'),
        ('INVITATION_ACCEPTED', 'Invitation Accepted'),
        ('TRANSACTION_ADDED', 'Transaction Added'),
        ('TRANSACTION_EDITED', 'Transaction Edited'),
        ('PERMISSION_CHANGED', 'Permission Changed'),
        ('MEMBER_REMOVED', 'Member Removed'),
        ('ACCOUNT_CREATED', 'Account Created'),
        ('ACCOUNT_UPDATED', 'Account Updated'),
    ]
    
    # Core fields
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        db_index=True
    )
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, db_index=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Related entities
    account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        db_index=True
    )
    triggered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='triggered_notifications',
        null=True,
        blank=True
    )
    
    # Status
    read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    data = models.JSONField(default=dict, blank=True)  # Additional context
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'notifications'
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'read', '-created_at']),
            models.Index(fields=['account', '-created_at']),
            models.Index(fields=['type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.type} - {self.user.username} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=['read', 'read_at'])
    
    def mark_as_unread(self):
        """Mark notification as unread"""
        if self.read:
            self.read = False
            self.read_at = None
            self.save(update_fields=['read', 'read_at'])
