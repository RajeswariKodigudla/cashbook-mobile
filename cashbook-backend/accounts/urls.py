from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountViewSet, AccountInvitationViewSet

router = DefaultRouter()
# Register invitations FIRST to avoid conflicts with accounts/{id}/ routes
router.register(r'accounts/invitations', AccountInvitationViewSet, basename='account-invitation')
router.register(r'accounts', AccountViewSet, basename='account')

urlpatterns = [
    path('', include(router.urls)),
]
