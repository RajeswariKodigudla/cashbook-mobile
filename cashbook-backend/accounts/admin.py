from django.contrib import admin
from .models import Account, AccountMember


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'owner', 'member_count', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['name', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def member_count(self, obj):
        return obj.get_member_count()
    member_count.short_description = 'Members'


@admin.register(AccountMember)
class AccountMemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'account', 'user', 'status', 'invited_by', 'invited_at']
    list_filter = ['status', 'invited_at']
    search_fields = ['account__name', 'user__username']
    readonly_fields = ['invited_at', 'accepted_at', 'created_at', 'updated_at']
    date_hierarchy = 'invited_at'
