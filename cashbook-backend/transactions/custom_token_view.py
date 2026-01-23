"""
Custom token view with database logging (FIXED)
"""
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom serializer with database logging
    + explicit authentication fix
    """

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        # Log database information
        db_info = connection.settings_dict
        logger.info(
            f"Login attempt for username: '{username}' | "
            f"Database: {db_info.get('NAME', 'unknown')} | "
            f"Engine: {db_info.get('ENGINE', 'unknown')} | "
            f"Host: {db_info.get('HOST', 'unknown')}"
        )

        if not username or not password:
            raise Exception("Username and password are required")

        # 🔑 CRITICAL FIX: normalize + authenticate manually
        username = username.strip()

        user = authenticate(
            request=self.context.get("request"),
            username=username,
            password=password,
        )

        if user is None:
            logger.warning(f"Invalid login for username: {username}")
            raise Exception("Invalid username or password")

        if not user.is_active:
            raise Exception("User account is disabled")

        # Now safely call SimpleJWT logic
        data = super().validate(attrs)

        # Log success
        logger.info(
            f"Login successful for '{username}' | "
            f"Database: {db_info.get('NAME', 'unknown')}"
        )

        # Optional: attach user info (does NOT break frontend)
        data["user"] = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        }

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view with safe error handling
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"JWT login error: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": "Invalid username or password",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
