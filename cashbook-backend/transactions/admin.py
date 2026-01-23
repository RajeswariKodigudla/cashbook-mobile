from django.contrib import admin
from .models import Transaction, UserCustomField


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'type', 'category', 'amount', 'mode', 'date', 'time', 'created_at'
    ]
    list_filter = ['type', 'category', 'mode', 'date', 'recurring']
    search_fields = ['name', 'remark', 'user__username', 'category', 'employer_name', 'vendor_name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'type', 'category', 'amount', 'name', 'remark', 'mode', 'date', 'time')
        }),
        ('Salary/Income Details', {
            'fields': ('employer_name', 'salary_month', 'tax_deducted', 'net_amount'),
            'classes': ('collapse',),
        }),
        ('Expense Details', {
            'fields': ('vendor_name', 'invoice_number', 'receipt_number', 'tax_amount', 'tax_percentage'),
            'classes': ('collapse',),
        }),
        ('Additional Information', {
            'fields': ('location', 'tags', 'attachments', 'recurring', 'recurring_frequency', 'next_due_date', 'custom_fields'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(UserCustomField)
class UserCustomFieldAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'field_label', 'field_type', 'is_required', 'is_active', 'order'
    ]
    list_filter = ['field_type', 'is_required', 'is_active', 'transaction_types']
    search_fields = ['field_name', 'field_label', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
