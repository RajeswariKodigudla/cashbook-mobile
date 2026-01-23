from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .views import (
    TransactionViewSet, 
    register_user, 
    logout_user,
    user_profile,
    change_password,
    verify_token,
    auth_status
)
from .serializers import UserCustomFieldSerializer
from .models import UserCustomField

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def custom_fields(request):
    """Get or create user custom fields"""
    if request.method == 'GET':
        fields = UserCustomField.objects.filter(user=request.user, is_active=True).order_by('order')
        serializer = UserCustomFieldSerializer(fields, many=True)
        return Response({'success': True, 'data': serializer.data})
    elif request.method == 'POST':
        serializer = UserCustomFieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response({'success': True, 'data': serializer.data}, status=201)
        return Response({'success': False, 'errors': serializer.errors}, status=400)

urlpatterns = [
    path('auth/status/', auth_status, name='auth_status'),  # Authentication status check
    path('register/', register_user, name='register'),
    path('logout/', logout_user, name='logout'),
    path('user/', user_profile, name='user_profile'),
    path('password/change/', change_password, name='change_password'),
    path('token/verify/', verify_token, name='verify_token'),
    path('custom-fields/', custom_fields, name='custom_fields'),
    path('', include(router.urls)),
]

