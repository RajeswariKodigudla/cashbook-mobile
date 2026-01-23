from django.db import models
from django.contrib.auth.models import User
from django.apps import apps
import json


class UserCustomField(models.Model):
    """User-level custom field definitions"""
    FIELD_TYPE_CHOICES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('select', 'Select'),
        ('boolean', 'Boolean'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_fields')
    field_name = models.CharField(max_length=100)
    field_label = models.CharField(max_length=200)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    options = models.JSONField(default=list, blank=True)  # For select fields
    transaction_types = models.JSONField(default=list)  # Which transaction types this field applies to
    category_ids = models.JSONField(default=list, blank=True)  # Specific categories (empty = all)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_custom_fields'  # Clean table name
        verbose_name = 'User Custom Field'
        verbose_name_plural = 'User Custom Fields'
        unique_together = ['user', 'field_name']
        ordering = ['order', 'field_label']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.field_label}"


class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('Income', 'Income'),
        ('Expense', 'Expense'),
    ]
    
    PAYMENT_MODE_CHOICES = [
        ('Cash', 'Cash'),
        ('Online', 'Online'),
        ('Card', 'Card'),
        ('UPI', 'UPI'),
        ('Bank Transfer', 'Bank Transfer'),
        ('Other', 'Other'),
    ]
    
    # Basic fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.CASCADE,
        related_name='transactions',
        null=True,
        blank=True,
        db_index=True,
        help_text='Account this transaction belongs to (null for personal transactions)',
        limit_choices_to={'type': 'SHARED'}  # Only allow shared accounts
    )
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, blank=True)  # e.g., Salary, Food, Rent
    name = models.CharField(max_length=255, blank=True)
    remark = models.TextField(blank=True)
    mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default='Cash')
    date = models.DateField()
    time = models.TimeField()
    
    # Enhanced fields for different transaction types
    # Salary/Income specific
    employer_name = models.CharField(max_length=255, blank=True)
    salary_month = models.CharField(max_length=20, blank=True)  # e.g., "2024-01"
    tax_deducted = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Expense specific
    vendor_name = models.CharField(max_length=255, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    receipt_number = models.CharField(max_length=100, blank=True)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Common fields
    location = models.CharField(max_length=255, blank=True)
    tags = models.JSONField(default=list, blank=True)  # Array of tags
    attachments = models.JSONField(default=list, blank=True)  # Array of file URLs/paths
    recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, blank=True)  # daily, weekly, monthly, yearly
    next_due_date = models.DateField(null=True, blank=True)
    
    # Custom fields (JSON field to store user-defined fields)
    custom_fields = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transactions'  # Clean table name (no app prefix)
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-date', '-time']
        indexes = [
            # User-based indexes (for personal transactions)
            models.Index(fields=['user', '-date', '-time']),
            models.Index(fields=['user', 'type']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'recurring']),
            # Account-based indexes (for shared account transactions - HIGH PERFORMANCE)
            # CRITICAL: Composite index for account queries (optimizes shared account transaction filtering)
            models.Index(fields=['account', '-date', '-time'], name='txn_acct_date_time_idx'),
            models.Index(fields=['account', 'type'], name='txn_acct_type_idx'),
            # CRITICAL: Composite index for account isolation queries (account + user + date)
            # This dramatically improves performance when filtering transactions by account AND user
            # Used in get_queryset() when filtering by account_id with user context
            models.Index(fields=['account', 'user', '-date', '-time'], name='txn_acct_user_date_idx'),
        ]
    
    def __str__(self):
        return f"{self.type} - {self.amount} - {self.category} - {self.user.username}"

