from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinLengthValidator


class Account(models.Model):
    """
    Enterprise-level account model for shared cashbook accounts
    Supports multiple users with role-based permissions
    """
    ACCOUNT_TYPES = [
        ('PERSONAL', 'Personal'),
        ('SHARED', 'Shared'),
    ]
    
    # Core fields
    name = models.CharField(
        max_length=255,
        validators=[MinLengthValidator(1)],
        db_index=True
    )
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='PERSONAL')
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_accounts',
        db_index=True
    )
    
    # Metadata
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'accounts'
        db_table = 'accounts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.type}) - {self.owner.username}"
    
    def is_owner(self, user):
        """Check if user is the owner"""
        return self.owner_id == user.id
    
    def get_members(self):
        """Get all accepted members"""
        # Use the reverse relationship if available, otherwise query directly
        try:
            return self.members.filter(status='ACCEPTED')
        except:
            # Fallback if reverse relationship not available
            return AccountMember.objects.filter(account=self, status='ACCEPTED')
    
    def get_member_count(self):
        """Get count of accepted members"""
        # Use the reverse relationship if available, otherwise query directly
        try:
            return self.members.filter(status='ACCEPTED').count()
        except:
            # Fallback if reverse relationship not available
            return AccountMember.objects.filter(account=self, status='ACCEPTED').count()


class AccountMember(models.Model):
    """
    Account membership with role-based permissions
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]
    
    # Core fields
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='members',
        db_index=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='account_memberships',
        db_index=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    
    # Permissions (granular control)
    can_add_entry = models.BooleanField(default=True)
    can_edit_own_entry = models.BooleanField(default=True)
    can_edit_all_entries = models.BooleanField(default=False)
    can_delete_entry = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=True)
    can_manage_members = models.BooleanField(default=False)
    
    # Metadata
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='sent_invitations',
        null=True,
        blank=True
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'accounts'
        db_table = 'account_members'
        unique_together = ['account', 'user']
        indexes = [
            models.Index(fields=['account', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', '-invited_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.account.name} ({self.status})"
    
    def accept(self):
        """Accept invitation"""
        if self.status == 'PENDING':
            self.status = 'ACCEPTED'
            self.accepted_at = timezone.now()
            self.save(update_fields=['status', 'accepted_at'])
    
    def reject(self):
        """Reject invitation"""
        if self.status == 'PENDING':
            self.status = 'REJECTED'
            self.save(update_fields=['status'])
