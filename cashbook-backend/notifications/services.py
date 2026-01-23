"""
Notification service layer for creating notifications
This provides a clean API for creating notifications from anywhere in the app
"""
from typing import Optional, Dict, Any
from django.contrib.auth.models import User
from .models import Notification
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Enterprise-level notification service"""
    
    @staticmethod
    def create_notification(
        user: User,
        notification_type: str,
        title: str,
        message: str,
        triggered_by: Optional[User] = None,
        account=None,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Create a notification with proper validation and error handling
        """
        notification = Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            triggered_by=triggered_by,
            account=account,
            data=data or {}
        )
        return notification
    
    @staticmethod
    def notify_account_members(
        account,
        notification_type: str,
        title: str,
        message: str,
        triggered_by: User,
        exclude_user: Optional[User] = None,
        data: Optional[Dict[str, Any]] = None
    ):
        """
        Notify all members of an account (except excluded user)
        This is optimized for bulk operations
        """
        from accounts.models import AccountMember
        
        logger.info(f"🔔 [NotificationService] Starting notification creation for account {account.id} ({account.name})")
        logger.info(f"🔔 [NotificationService] Notification type: {notification_type}")
        logger.info(f"🔔 [NotificationService] Triggered by: {triggered_by.username} (ID: {triggered_by.id})")
        logger.info(f"🔔 [NotificationService] Exclude user: {exclude_user.username if exclude_user else 'None'} (ID: {exclude_user.id if exclude_user else 'None'})")
        
        members = AccountMember.objects.filter(
            account=account,
            status='ACCEPTED'
        ).select_related('user')
        
        total_members = members.count()
        logger.info(f"🔔 [NotificationService] Found {total_members} ACCEPTED members for account {account.id}")
        
        notifications = []
        excluded_count = 0
        for member in members:
            logger.info(f"🔔 [NotificationService] Processing member: {member.user.username} (ID: {member.user.id})")
            
            if exclude_user and member.user_id == exclude_user.id:
                logger.info(f"🔔 [NotificationService] Excluding {member.user.username} (triggered_by user)")
                excluded_count += 1
                continue
            
            logger.info(f"🔔 [NotificationService] Adding notification for {member.user.username}")
            notification = Notification(
                user=member.user,
                type=notification_type,
                title=title,
                message=message,
                triggered_by=triggered_by,
                account=account,
                data=data or {},
                read=False  # CRITICAL: Explicitly set read=False to ensure unread notifications
            )
            logger.info(f"🔔 [NotificationService] Created notification object: User={member.user.username}, Type={notification_type}, Read={notification.read}")
            notifications.append(notification)
        
        logger.info(f"🔔 [NotificationService] Total members: {total_members}, Excluded: {excluded_count}, Notifications to create: {len(notifications)}")
        
        # Bulk create for performance
        if notifications:
            try:
                # CRITICAL: Use bulk_create to create notifications
                Notification.objects.bulk_create(notifications)
                logger.info(f"✅ [NotificationService] Successfully created {len(notifications)} notifications via bulk_create")
                
                # CRITICAL: Verify notifications were actually saved to database
                # bulk_create doesn't return IDs, so we verify by querying
                from django.utils import timezone
                from datetime import timedelta
                
                # Get notifications created in the last 5 seconds for verification
                recent_time = timezone.now() - timedelta(seconds=5)
                for notif in notifications:
                    recent = Notification.objects.filter(
                        user=notif.user,
                        type=notif.type,
                        account=notif.account,
                        created_at__gte=recent_time
                    ).order_by('-created_at').first()
                    if recent:
                        logger.info(f"✅ [NotificationService] Verified notification created: ID={recent.id}, User={recent.user.username}, Read={recent.read}, Message='{recent.message[:50]}...'")
                    else:
                        logger.error(f"❌ [NotificationService] Notification NOT found in database after creation! User={notif.user.username}, Type={notif.type}")
                        
            except Exception as e:
                logger.error(f"❌ [NotificationService] Error during bulk_create: {str(e)}", exc_info=True)
                raise
        else:
            logger.warning(f"⚠️ [NotificationService] No notifications to create (all members excluded or no members found)")
        
        return len(notifications)

