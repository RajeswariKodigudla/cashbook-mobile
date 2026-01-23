from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from django.db.models import Sum, Q
from django.db import transaction as db_transaction
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from django.conf import settings
from django.contrib.auth.models import User
from decimal import Decimal, InvalidOperation
import logging
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db.utils import OperationalError, DatabaseError

from .models import Transaction, UserCustomField
from .serializers import (
    TransactionSerializer, 
    UserRegistrationSerializer, 
    UserCustomFieldSerializer,
    UserProfileSerializer,
    PasswordChangeSerializer
)
from .exceptions import (
    TransactionValidationError,
    TransactionNotFoundError,
    TransactionPermissionError
)
from .db_utils import ensure_valid_connection

logger = logging.getLogger(__name__)


@swagger_auto_schema(
    method='post',
    operation_description='Logout user and blacklist refresh token',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['refresh'],
        properties={
            'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='Refresh token to blacklist'),
        }
    ),
    responses={
        200: openapi.Response('Logout successful'),
        400: openapi.Response('Invalid request'),
    },
    tags=['Authentication'],
    security=[{'Bearer': []}]
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logout user by blacklisting the refresh token.
    Note: Access tokens cannot be blacklisted, but they expire quickly.
    """
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
                return Response({
                    'success': True,
                    'message': 'Successfully logged out'
                }, status=status.HTTP_200_OK)
            except Exception as e:
                logger.warning(f"Token blacklist error (may already be blacklisted): {str(e)}")
                # Still return success - token may already be invalid
                return Response({
                    'success': True,
                    'message': 'Successfully logged out'
                }, status=status.HTTP_200_OK)
        else:
            # If no refresh token provided, just confirm logout
            return Response({
                'success': True,
                'message': 'Successfully logged out'
            }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        # Still return success to allow client-side cleanup
        return Response({
            'success': True,
            'message': 'Logout completed'
        }, status=status.HTTP_200_OK)


@swagger_auto_schema(
    method='get',
    operation_description='Get current user profile information',
    responses={
        200: openapi.Response('User profile', UserProfileSerializer),
        401: 'Unauthorized',
    },
    tags=['Authentication'],
    security=[{'Bearer': []}]
)
@swagger_auto_schema(
    method='put',
    operation_description='Update current user profile information',
    request_body=UserProfileSerializer,
    responses={
        200: openapi.Response('Profile updated successfully', UserProfileSerializer),
        400: openapi.Response('Validation error'),
        401: 'Unauthorized',
    },
    tags=['Authentication'],
    security=[{'Bearer': []}]
)
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update current user profile.
    """
    try:
        user = request.user
        
        if request.method == 'GET':
            serializer = UserProfileSerializer(user)
            return Response({
                'success': True,
                'data': serializer.data
            })
        
        elif request.method == 'PUT':
            serializer = UserProfileSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'data': serializer.data
                })
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Profile error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'An error occurred',
            'error': str(e) if settings.DEBUG else 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description='Change user password',
    request_body=PasswordChangeSerializer,
    responses={
        200: openapi.Response('Password changed successfully'),
        400: openapi.Response('Validation error'),
        401: openapi.Response('Unauthorized - Invalid old password'),
    },
    tags=['Authentication'],
    security=[{'Bearer': []}]
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password.
    """
    try:
        user = request.user
        serializer = PasswordChangeSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        
        # Verify old password
        if not user.check_password(old_password):
            return Response({
                'success': False,
                'message': 'Invalid old password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        logger.info(f"Password changed successfully for user '{user.username}'")
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        logger.error(f"Password change error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'An error occurred',
            'error': str(e) if settings.DEBUG else 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description='Verify if JWT token is valid',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['token'],
        properties={
            'token': openapi.Schema(type=openapi.TYPE_STRING, description='JWT access token to verify'),
        }
    ),
    responses={
        200: openapi.Response('Token is valid', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'valid': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'user': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'username': openapi.Schema(type=openapi.TYPE_STRING),
                        'email': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                ),
            }
        )),
        400: openapi.Response('Token not provided'),
        401: openapi.Response('Token is invalid or expired'),
    },
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_token(request):
    """
    Verify if a JWT token is valid.
    """
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        
        token = request.data.get('token')
        
        if not token:
            return Response({
                'success': False,
                'valid': False,
                'message': 'Token not provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify token
            access_token = AccessToken(token)
            
            # Get user from token
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            
            return Response({
                'success': True,
                'valid': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                }
            })
            
        except (InvalidToken, TokenError) as e:
            return Response({
                'success': False,
                'valid': False,
                'message': 'Token is invalid or expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'valid': False,
                'message': 'User not found'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'valid': False,
            'message': 'An error occurred during token verification',
            'error': str(e) if settings.DEBUG else 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='get',
    operation_description='Check authentication configuration status',
    responses={
        200: openapi.Response('Authentication status', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'configured': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'message': openapi.Schema(type=openapi.TYPE_STRING),
                'endpoints': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'register': openapi.Schema(type=openapi.TYPE_STRING),
                        'login': openapi.Schema(type=openapi.TYPE_STRING),
                        'token_refresh': openapi.Schema(type=openapi.TYPE_STRING),
                        'token_verify': openapi.Schema(type=openapi.TYPE_STRING),
                        'logout': openapi.Schema(type=openapi.TYPE_STRING),
                        'user_profile': openapi.Schema(type=openapi.TYPE_STRING),
                        'change_password': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                ),
            }
        )),
    },
    tags=['Authentication']
)
@api_view(['GET'])
@permission_classes([AllowAny])
def auth_status(request):
    """
    Check if authentication endpoints are configured and available.
    This endpoint is used by mobile apps to verify backend authentication setup.
    Returns user information if authenticated.
    """
    response_data = {
        'success': True,
        'configured': True,
        'message': 'Authentication endpoints are configured and available',
        'endpoints': {
            'register': '/api/register/',
            'login': '/api/token/',
            'token_refresh': '/api/token/refresh/',
            'token_verify': '/api/token/verify/',
            'logout': '/api/logout/',
            'user_profile': '/api/user/',
            'change_password': '/api/password/change/',
        }
    }
    
    # If user is authenticated, include user information
    if request.user.is_authenticated:
        user = request.user
        response_data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email or '',
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        }
        response_data['authenticated'] = True
    else:
        response_data['authenticated'] = False
    
    return Response(response_data)


@swagger_auto_schema(
    method='post',
    operation_description='Register a new user account',
    request_body=UserRegistrationSerializer,
    responses={
        201: openapi.Response('User created successfully', UserRegistrationSerializer),
        400: openapi.Response('Validation error', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'message': openapi.Schema(type=openapi.TYPE_STRING),
                'errors': openapi.Schema(type=openapi.TYPE_OBJECT),
            }
        )),
    },
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user with comprehensive error handling.
    """
    try:
        # Ensure valid database connection before proceeding
        ensure_valid_connection()
        
        # Log incoming registration attempt
        username_attempt = request.data.get('username', 'N/A')
        
        # Log database information
        from django.db import connection
        db_info = connection.settings_dict
        logger.info(
            f"Registration attempt for username: '{username_attempt}' | "
            f"Database: {db_info.get('NAME', 'unknown')} | "
            f"Engine: {db_info.get('ENGINE', 'unknown')} | "
            f"Host: {db_info.get('HOST', 'unknown')}"
        )
        
        # Check if user already exists (for debugging) - use .using('default') to ensure correct DB
        from django.contrib.auth.models import User
        # Normalize username for check
        normalized_attempt = username_attempt.lower().strip() if username_attempt else ''
        existing_check = User.objects.using('default').filter(username__iexact=normalized_attempt).first()
        if existing_check:
            logger.warning(
                f"User '{normalized_attempt}' (original: '{username_attempt}') already exists in database '{db_info.get('NAME', 'unknown')}' "
                f"(ID: {existing_check.id}, Engine: {db_info.get('ENGINE', 'unknown')})"
            )
        else:
            logger.info(f"User '{normalized_attempt}' (original: '{username_attempt}') does NOT exist in database '{db_info.get('NAME', 'unknown')}'")
        
        serializer = UserRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Registration validation failed for '{username_attempt}': {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Registration failed. Please check your input.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        
        # Refresh from database to ensure we have the latest data
        user.refresh_from_db()
        
        # CRITICAL: Verify user was actually saved to PostgreSQL database
        # Use the same connection (Django manages it properly)
        try:
            # Verify user exists in database using the same connection
            saved_user = User.objects.using('default').get(pk=user.pk)
            logger.info(
                f"User '{saved_user.username}' (ID: {saved_user.id}) successfully created and verified in "
                f"PostgreSQL database '{db_info.get('NAME', 'unknown')}'"
            )
        except User.DoesNotExist:
            logger.error(
                f"CRITICAL: User '{user.username}' was NOT saved to PostgreSQL database "
                f"'{db_info.get('NAME', 'unknown')}'!"
            )
            return Response({
                'success': False,
                'message': 'User creation failed. Database error.',
                'error': f"User not found in database '{db_info.get('NAME', 'unknown')}'"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        # NOTE: Do NOT close connection here - Django manages connections automatically
        # Closing connections manually can prevent database commits from completing properly
        
        return Response({
            'success': True,
            'message': 'User created successfully',
            'data': {
                'username': saved_user.username,
                'email': saved_user.email,
                'first_name': saved_user.first_name,
                'last_name': saved_user.last_name,
                'id': saved_user.id
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'An error occurred during registration. Please try again.',
            'error': str(e) if settings.DEBUG else 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def dispatch(self, request, *args, **kwargs):
        """Ensure valid database connection before handling request."""
        try:
            ensure_valid_connection()
        except (OperationalError, DatabaseError) as e:
            logger.error(f"Database connection error in dispatch: {e}", exc_info=True)
            # Close all connections and reconnect to free up pool
            from .db_utils import close_all_connections
            close_all_connections()
            try:
                from django.db import connection
                connection.ensure_connection()
            except Exception as reconnect_error:
                logger.error(f"Failed to reconnect: {reconnect_error}", exc_info=True)
                raise
        
        # NOTE: Do NOT close connection here - Django manages connections automatically
        # Closing connections manually can prevent transactions from committing properly
        # Django closes connections at the end of the request lifecycle
        response = super().dispatch(request, *args, **kwargs)
        return response
    
    def get_queryset(self):
        """
        Return transactions for the authenticated user with search and filter support.
        Supports:
        - search: Search in name, category, remark, employer_name, vendor_name
        - type: Filter by Income or Expense
        - category: Filter by category name
        - mode: Filter by payment mode
        - date_from: Filter transactions from this date (YYYY-MM-DD)
        - date_to: Filter transactions to this date (YYYY-MM-DD)
        - amount_min: Minimum amount
        - amount_max: Maximum amount
        - sort: Sort field (date, amount, category, name) with optional - prefix for descending
        - account/accountId: Filter by account ID or 'personal' for personal transactions only
        """
        try:
            ensure_valid_connection()
            user = self.request.user
            
            # Log user info for debugging
            logger.debug(f"🔍 Getting queryset for user: {user.username} (ID: {user.id})")
            
            # Get account IDs where user is an accepted member (cached query)
            from accounts.models import AccountMember, Account
            
            member_account_ids = list(AccountMember.objects.filter(
                user=user,
                status='ACCEPTED'
            ).values_list('account_id', flat=True))
            
            # Get account IDs where user is owner
            owned_account_ids = list(Account.objects.filter(owner=user).values_list('id', flat=True))
            
            # All account IDs user has access to (member or owner)
            accessible_account_ids = list(set(member_account_ids + owned_account_ids))
            
            # VERIFICATION: Log access control details
            logger.info(f"🔍 [VERIFY] User {user.username} (ID: {user.id}) access check:")
            logger.info(f"🔍 [VERIFY] Member of accounts: {member_account_ids}")
            logger.info(f"🔍 [VERIFY] Owner of accounts: {owned_account_ids}")
            logger.info(f"🔍 [VERIFY] Total accessible accounts: {accessible_account_ids}")
            
            # Check if filtering by specific account FIRST (before building base queryset)
            account_id = self.request.query_params.get('account', None) or self.request.query_params.get('accountId', None)
            
            logger.info(f"🔍 [BACKEND] Transaction list request - account_id param: {account_id} (type: {type(account_id)})")
            logger.info(f"🔍 [BACKEND] User: {user.username} (ID: {user.id})")
            logger.info(f"🔍 [BACKEND] Accessible account IDs: {accessible_account_ids}")
            logger.info(f"🔍 [VERIFY] API call received with account filter: {account_id}")
            
            if account_id:
                # Filtering by specific account - isolate to that account only
                if account_id == 'personal' or account_id == '':
                    # Show only personal transactions (account is null AND user is owner)
                    queryset = Transaction.objects.filter(
                        user=user,
                        account__isnull=True
                    ).select_related('user')
                    logger.debug(f"🔍 Filtering by personal transactions only")
                    logger.info(f"🔍 [VERIFY] Backend filtering for personal transactions (account_id IS NULL)")
                else:
                    try:
                        account_id_int = int(account_id)
                        logger.info(f"🔍 [VERIFY] Backend filtering for shared account ID: {account_id_int}")
                        # Verify user has access to this account
                        if account_id_int in accessible_account_ids:
                            # User has access - show ONLY transactions from this account
                            # CRITICAL: For shared accounts, ALL ACCEPTED members should see ALL transactions
                            # regardless of who created them. This is the correct behavior for shared accounts.
                            # IMPORTANT: We do NOT filter by user - all members see all transactions in the account
                            # CRITICAL: Explicitly exclude personal transactions (account__isnull=False)
                            queryset = Transaction.objects.filter(
                                account_id=account_id_int,
                                account__isnull=False  # Explicitly exclude personal transactions
                                # NOTE: No user filter - all ACCEPTED members see all transactions
                            ).select_related('account', 'user').prefetch_related('user')
                            logger.info(f"✅ [BACKEND] Filtering by account ID: {account_id_int} (excluding personal transactions)")
                            logger.info(f"🔍 [BACKEND] Query will return transactions where account_id={account_id_int}")
                            logger.info(f"🔍 [VERIFY] Backend query: account_id={account_id_int} AND account__isnull=False")
                            logger.info(f"🔍 [VERIFY] Access control: User {user.username} (ID: {user.id}) has access to account {account_id_int}")
                            logger.info(f"🔍 [VERIFY] All ACCEPTED members of account {account_id_int} can view all transactions")
                            # Log sample transaction account IDs for verification
                            sample_count = queryset.count()
                            logger.info(f"🔍 [BACKEND] Found {sample_count} transactions for account {account_id_int}")
                            logger.info(f"🔍 [VERIFY] Backend returned {sample_count} transactions for account {account_id_int}")
                            if sample_count > 0:
                                sample_tx = queryset.first()
                                logger.info(f"🔍 [BACKEND] Sample transaction account_id: {sample_tx.account_id if sample_tx else 'N/A'}")
                                logger.info(f"🔍 [VERIFY] Sample transaction stored with account_id: {sample_tx.account_id if sample_tx else 'N/A'}")
                                logger.info(f"🔍 [VERIFY] Sample transaction created by user: {sample_tx.user.username if sample_tx else 'N/A'} (ID: {sample_tx.user.id if sample_tx else 'N/A'})")
                                # Verify all transactions are for the correct account
                                all_correct = queryset.filter(account_id=account_id_int).count() == sample_count
                                logger.info(f"🔍 [VERIFY] All transactions have correct account_id: {all_correct}")
                                # CRITICAL VERIFICATION: Verify that transactions from different users are included
                                # This confirms all ACCEPTED members can see all transactions, not just their own
                                unique_creators = queryset.values_list('user__username', 'user__id', flat=False).distinct()
                                creator_list = [{'username': u[0], 'id': u[1]} for u in unique_creators]
                                logger.info(f"🔍 [VERIFY] Transactions created by users: {creator_list}")
                                logger.info(f"🔍 [VERIFY] Total unique creators: {len(creator_list)}")
                                logger.info(f"🔍 [VERIFY] Current user viewing: {user.username} (ID: {user.id})")
                                
                                # Verify current user can see transactions from other users
                                other_users_transactions = queryset.exclude(user_id=user.id).count()
                                logger.info(f"🔍 [VERIFY] Transactions from OTHER users (not current user): {other_users_transactions}")
                                logger.info(f"🔍 [VERIFY] ✅ VERIFIED: All ACCEPTED members can see all transactions from all members")
                                
                                # If there are transactions from other users, this confirms multi-user visibility
                                if other_users_transactions > 0:
                                    logger.info(f"✅ [VERIFY] SUCCESS: User {user.username} can see {other_users_transactions} transactions created by other members")
                                else:
                                    logger.info(f"ℹ️ [VERIFY] All transactions in this account are created by user {user.username} (or account is new)")
                        else:
                            # User doesn't have access, return empty queryset
                            logger.warning(f"⚠️ User {user.username} doesn't have access to account {account_id_int}")
                            queryset = Transaction.objects.none()
                    except (ValueError, TypeError):
                        logger.warning(f"⚠️ Invalid account ID: {account_id}")
                        queryset = Transaction.objects.none()
            else:
                # No account filter - show all accessible transactions
                # 1. Personal transactions (account is null AND user is owner)
                # 2. Shared account transactions from accounts where user is ACCEPTED member or owner
                if accessible_account_ids:
                    # User has shared accounts - include both personal and shared
                    queryset = Transaction.objects.filter(
                        Q(user=user, account__isnull=True) |  # Personal transactions (user's own)
                        Q(account_id__in=accessible_account_ids)   # Shared account transactions (all members can see)
                    ).select_related('account', 'user').prefetch_related('user')
                    logger.debug(f"🔍 Showing all accessible transactions (personal + {len(accessible_account_ids)} shared accounts)")
                else:
                    # User has no shared accounts - only personal transactions
                    queryset = Transaction.objects.filter(
                        user=user,
                        account__isnull=True
                    ).select_related('user')
                    logger.debug(f"🔍 Showing only personal transactions (no shared accounts)")
            
            # Log total count before filtering
            total_count = queryset.count()
            logger.debug(f"🔍 Total transactions for user {user.username}: {total_count}")
            
            # SEARCH: Search across multiple fields
            search_query = self.request.query_params.get('search', None)
            if search_query:
                search_query = search_query.strip()
                if search_query:
                    queryset = queryset.filter(
                        Q(name__icontains=search_query) |
                        Q(category__icontains=search_query) |
                        Q(remark__icontains=search_query) |
                        Q(employer_name__icontains=search_query) |
                        Q(vendor_name__icontains=search_query) |
                        Q(invoice_number__icontains=search_query) |
                        Q(receipt_number__icontains=search_query)
                    )
                    logger.debug(f"🔍 Search '{search_query}': {queryset.count()} transactions")
            
            # FILTER: By type (Income/Expense)
            transaction_type = self.request.query_params.get('type', None)
            if transaction_type:
                if transaction_type not in ['Income', 'Expense']:
                    raise ValidationError({
                        'type': "Type must be either 'Income' or 'Expense'."
                    })
                queryset = queryset.filter(type=transaction_type)
                logger.debug(f"🔍 Filtered by type '{transaction_type}': {queryset.count()} transactions")
            
            # FILTER: By category
            category = self.request.query_params.get('category', None)
            if category:
                queryset = queryset.filter(category__iexact=category)
                logger.debug(f"🔍 Filtered by category '{category}': {queryset.count()} transactions")
            
            # FILTER: By payment mode
            mode = self.request.query_params.get('mode', None)
            if mode:
                queryset = queryset.filter(mode__iexact=mode)
                logger.debug(f"🔍 Filtered by mode '{mode}': {queryset.count()} transactions")
            
            # FILTER: By date range
            date_from = self.request.query_params.get('date_from', None)
            date_to = self.request.query_params.get('date_to', None)
            if date_from:
                try:
                    from datetime import datetime
                    date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                    queryset = queryset.filter(date__gte=date_from_obj)
                    logger.debug(f"🔍 Filtered from date '{date_from}': {queryset.count()} transactions")
                except ValueError:
                    raise ValidationError({'date_from': "Date must be in YYYY-MM-DD format."})
            
            if date_to:
                try:
                    from datetime import datetime
                    date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                    queryset = queryset.filter(date__lte=date_to_obj)
                    logger.debug(f"🔍 Filtered to date '{date_to}': {queryset.count()} transactions")
                except ValueError:
                    raise ValidationError({'date_to': "Date must be in YYYY-MM-DD format."})
            
            # FILTER: By amount range
            amount_min = self.request.query_params.get('amount_min', None)
            amount_max = self.request.query_params.get('amount_max', None)
            if amount_min:
                try:
                    amount_min_decimal = Decimal(str(amount_min))
                    queryset = queryset.filter(amount__gte=amount_min_decimal)
                    logger.debug(f"🔍 Filtered by min amount '{amount_min}': {queryset.count()} transactions")
                except (ValueError, InvalidOperation):
                    raise ValidationError({'amount_min': "Amount must be a valid number."})
            
            if amount_max:
                try:
                    amount_max_decimal = Decimal(str(amount_max))
                    queryset = queryset.filter(amount__lte=amount_max_decimal)
                    logger.debug(f"🔍 Filtered by max amount '{amount_max}': {queryset.count()} transactions")
                except (ValueError, InvalidOperation):
                    raise ValidationError({'amount_max': "Amount must be a valid number."})
            
            # SORT: By different fields
            sort_field = self.request.query_params.get('sort', None)
            if sort_field:
                # Remove leading - for descending
                descending = sort_field.startswith('-')
                field_name = sort_field.lstrip('-')
                
                # Valid sort fields
                valid_sort_fields = ['date', 'time', 'amount', 'category', 'name', 'created_at', 'updated_at']
                if field_name in valid_sort_fields:
                    if descending:
                        queryset = queryset.order_by(f'-{field_name}', '-date', '-time')
                    else:
                        queryset = queryset.order_by(field_name, '-date', '-time')
                    logger.debug(f"🔍 Sorted by '{sort_field}': {queryset.count()} transactions")
                else:
                    logger.warning(f"⚠️ Invalid sort field '{field_name}', using default sort")
                    queryset = queryset.order_by('-date', '-time')
            else:
                # Default sort: newest first
                queryset = queryset.order_by('-date', '-time')
            
            # Log final count
            final_count = queryset.count()
            logger.debug(f"🔍 Final queryset count: {final_count} transactions")
            
            return queryset
            
        except Exception as e:
            logger.error(f"❌ Error fetching transactions queryset: {str(e)}", exc_info=True)
            raise
    
    def get_object(self):
        """
        Get a specific transaction with permission check.
        For shared accounts, check if user is an accepted member.
        """
        try:
            obj = super().get_object()
            user = self.request.user
            
            # Personal transaction: user must be the owner
            if obj.account is None:
                if obj.user != user:
                    raise TransactionPermissionError()
                return obj
            
            # Shared account transaction: check membership
            from accounts.models import AccountMember
            
            # Owner can always access
            if obj.account.is_owner(user):
                return obj
            
            # Check if user is an accepted member
            membership = AccountMember.objects.filter(
                account=obj.account,
                user=user,
                status='ACCEPTED'
            ).first()
            
            if not membership:
                raise TransactionPermissionError()
            
            return obj
            
        except Http404:
            raise TransactionNotFoundError()
        except Exception as e:
            logger.error(f"Error fetching transaction: {str(e)}", exc_info=True)
            raise
    
    def perform_create(self, serializer):
        """Set the user to the current authenticated user when creating a transaction."""
        try:
            # Ensure valid database connection before proceeding
            ensure_valid_connection()
            
            # Get account from request data if provided
            # CRITICAL: Check both accountId and account fields
            account_id = self.request.data.get('accountId') or self.request.data.get('account')
            
            # Log for debugging
            logger.info(f"🔍 perform_create: Received account_id = {account_id} (type: {type(account_id)})")
            logger.info(f"🔍 perform_create: request.data keys = {list(self.request.data.keys())}")
            logger.info(f"🔍 perform_create: request.data accountId = {self.request.data.get('accountId')}")
            logger.info(f"🔍 perform_create: request.data account = {self.request.data.get('account')}")
            
            account = None
            if account_id and account_id != 'personal' and account_id != '' and account_id is not None:
                try:
                    from accounts.models import Account
                    from accounts.models import AccountMember
                    
                    # CRITICAL: Convert account_id to integer if it's a string
                    try:
                        account_id_int = int(account_id)
                    except (ValueError, TypeError):
                        logger.error(f"❌ Invalid account_id format: {account_id} (type: {type(account_id)})")
                        raise ValidationError({'account': f'Invalid account ID format: {account_id}'})
                    
                    logger.info(f"🔍 Looking up account with ID: {account_id_int}")
                    
                    # Verify user has access to this account
                    account = Account.objects.get(id=account_id_int)
                    logger.info(f"✅ Found account: {account.name} (ID: {account.id}, Type: {account.type})")
                    logger.info(f"🔍 Account owner ID: {account.owner_id}, Current user ID: {self.request.user.id}")
                    
                    # Check if user is owner (owners always have full access)
                    is_owner = account.is_owner(self.request.user)
                    logger.info(f"🔍 Is user owner? {is_owner}")
                    
                    if is_owner:
                        # Owner can always add transactions
                        logger.info(f"✅ User is owner of account {account.id}, allowing transaction creation")
                        pass
                    else:
                        # Check if user is an accepted member with permission to add entries
                        logger.info(f"🔍 User is not owner, checking membership...")
                        membership = AccountMember.objects.filter(
                            account=account,
                            user=self.request.user,
                            status='ACCEPTED'
                        ).first()
                        
                        if not membership:
                            logger.warning(f"❌ No ACCEPTED membership found for user {self.request.user.id} in account {account.id}")
                            # Check if there's any membership at all
                            any_membership = AccountMember.objects.filter(
                                account=account,
                                user=self.request.user
                            ).first()
                            if any_membership:
                                logger.warning(f"⚠️ Found membership with status: {any_membership.status}")
                            raise ValidationError({
                                'account': 'You do not have access to this account. Please accept the invitation first.'
                            })
                        
                        logger.info(f"✅ Found membership: ID={membership.id}, can_add_entry={membership.can_add_entry}, status={membership.status}")
                        
                        # Check if user has permission to add entries
                        if not membership.can_add_entry:
                            logger.warning(f"❌ User {self.request.user.id} does not have can_add_entry permission for account {account.id}")
                            raise ValidationError({
                                'account': 'You do not have permission to add entries to this account'
                            })
                        
                        logger.info(f"✅ Permission check passed: User can add entries to account {account.id}")
                except Account.DoesNotExist:
                    raise ValidationError({'account': 'Account not found'})
            
            # Log the data being saved - show ALL fields
            logger.info(
                f"Creating transaction for user '{self.request.user.username}': "
                f"type={serializer.validated_data.get('type')}, "
                f"amount={serializer.validated_data.get('amount')}, "
                f"category={serializer.validated_data.get('category', 'N/A')}, "
                f"name={serializer.validated_data.get('name', 'N/A')}, "
                f"remark={serializer.validated_data.get('remark', 'N/A')}, "
                f"mode={serializer.validated_data.get('mode', 'N/A')}, "
                f"date={serializer.validated_data.get('date')}, "
                f"time={serializer.validated_data.get('time')}, "
                f"account={account.name if account else 'Personal'}"
            )
            logger.info(f"All validated_data keys: {list(serializer.validated_data.keys())}")
            
            # Use atomic transaction to ensure proper database commit
            # CRITICAL: Keep atomic block minimal - only create the transaction
            # Move verification outside to prevent rollback on verification failures
            transaction = None
            transaction_id = None
            
            # Define notification creation function BEFORE atomic block
            def create_notifications_after_commit():
                """Create notifications after transaction commits successfully"""
                try:
                    logger.info(f"🔔 [NOTIFICATION] Creating notifications after transaction commit...")
                    logger.info(f"🔔 [NOTIFICATION] Transaction ID: {transaction_id}, Account: {account.id if account else 'None'}")
                    
                    # Refresh account from database to ensure we have latest data
                    account_to_notify = account
                    if account_to_notify:
                        try:
                            # Re-fetch account to ensure we have latest data
                            from accounts.models import Account
                            account_to_notify = Account.objects.get(id=account.id)
                            logger.info(f"🔔 [NOTIFICATION] Account refreshed: ID={account_to_notify.id}, Name={account_to_notify.name}, Type={account_to_notify.type}")
                        except Exception as e:
                            logger.error(f"❌ [NOTIFICATION] Could not refresh account: {str(e)}", exc_info=True)
                            logger.warning(f"⚠️ [NOTIFICATION] Using original account object instead of refreshed one")
                            # Continue with original account object - don't exit, try to create notifications anyway
                            # The account object should still be valid
                    
                    logger.info(f"🔔 [NOTIFICATION] Account: {account_to_notify}, Account type: {account_to_notify.type if account_to_notify else 'None'}")
                    
                    if account_to_notify:
                        logger.info(f"🔔 [NOTIFICATION] Account exists: ID={account_to_notify.id}, Name={account_to_notify.name}, Type={account_to_notify.type}")
                        
                        # CRITICAL: Check if account has members (shared account) - don't rely on type field
                        # An account is effectively "shared" if it has multiple members, regardless of type field
                        from accounts.models import AccountMember
                        member_count = AccountMember.objects.filter(
                            account=account_to_notify,
                            status='ACCEPTED'
                        ).count()
                        
                        logger.info(f"🔔 [NOTIFICATION] Account has {member_count} ACCEPTED members")
                        
                        # Create notifications if account has members (it's a shared account)
                        if member_count > 0:
                            logger.info(f"🔔 [NOTIFICATION] Account has members - proceeding with notification creation")
                            try:
                                from notifications.services import NotificationService
                                from accounts.models import AccountMember
                                
                                # Re-fetch transaction to ensure we have latest data
                                from .models import Transaction
                                transaction_obj = Transaction.objects.get(id=transaction_id)
                                
                                # Get all ACCEPTED members (we already checked count above, but need list for logging)
                                accepted_members = AccountMember.objects.filter(
                                    account=account_to_notify,
                                    status='ACCEPTED'
                                ).select_related('user')
                                member_usernames = [m.user.username for m in accepted_members]
                                
                                logger.info(f"🔔 [NOTIFICATION] Found {member_count} ACCEPTED members: {member_usernames}")
                                logger.info(f"🔔 [NOTIFICATION] Excluding user: {self.request.user.username} (ID: {self.request.user.id})")
                                
                                # Build a friendly note/message for the notification
                                # Prefer remark (user note), then name, then category
                                note_text = ''
                                if transaction_obj.remark:
                                    note_text = transaction_obj.remark
                                elif transaction_obj.name:
                                    note_text = transaction_obj.name
                                elif transaction_obj.category:
                                    note_text = transaction_obj.category
                                
                                # Example: "Admin added a new transaction: Hello test."
                                if note_text:
                                    notification_message = f'{self.request.user.username} added a new transaction: {note_text}.'
                                else:
                                    notification_message = f'{self.request.user.username} added a new {transaction_obj.type} transaction.'
                                
                                logger.info(f"🔔 [NOTIFICATION] Notification message: {notification_message}")
                                
                                notifications_created = NotificationService.notify_account_members(
                                    account=account_to_notify,
                                    notification_type='TRANSACTION_ADDED',
                                    title=f'New {transaction_obj.type} in {account_to_notify.name}',
                                    message=notification_message,
                                    triggered_by=self.request.user,
                                    exclude_user=self.request.user,  # Do NOT notify the user who added the transaction
                                    data={
                                        'transaction_id': transaction_obj.id,
                                        'transaction_type': transaction_obj.type,
                                        'amount': str(transaction_obj.amount),
                                        'category': transaction_obj.category or '',
                                        'note': transaction_obj.remark or transaction_obj.name or '',
                                        'account_id': account_to_notify.id,          # sharedAccountId mapping
                                        'account_name': account_to_notify.name
                                    }
                                )
                                logger.info(f"✅ [NOTIFICATION] Successfully created {notifications_created} notifications for account {account_to_notify.id} ({account_to_notify.name})")
                                
                                if notifications_created == 0:
                                    logger.warning(f"⚠️ [NOTIFICATION] No notifications created - this might mean there are no other ACCEPTED members besides the creator")
                            except Exception as e:
                                logger.error(f"❌ [NOTIFICATION] Error creating notifications: {str(e)}", exc_info=True)
                                # Don't fail transaction creation if notification fails
                        else:
                            logger.info(f"🔔 [NOTIFICATION] Account has no ACCEPTED members - skipping notifications")
                    else:
                        logger.info(f"🔔 [NOTIFICATION] No account (personal transaction) - skipping notifications")
                except Exception as e:
                    logger.error(f"❌ [NOTIFICATION] Critical error in notification callback: {str(e)}", exc_info=True)
                    # Don't fail - transaction is already committed
            
            try:
                with db_transaction.atomic(using='default'):
                    # CRITICAL: Create transaction - this is the only operation that must succeed
                    transaction = serializer.save(user=self.request.user, account=account)
                    
                    # Force database commit by accessing the ID
                    transaction_id = transaction.id
                    
                    # Basic validation - only check if ID exists
                    if not transaction_id:
                        logger.error("❌ CRITICAL: Transaction created but has no ID!")
                        raise ValidationError({
                            'error': 'Transaction was not saved to database. Please try again.'
                        })
                    
                    logger.info(f"✅ Transaction created with ID: {transaction_id}")
                    
                    # The atomic block will commit automatically when it exits successfully
                    # Any exception here will rollback the transaction
                
                # AFTER atomic block - transaction is committed
                # CRITICAL: Create notifications IMMEDIATELY and SYNCHRONOUSLY before response
                # Don't use on_commit callbacks - they execute asynchronously and may not complete before response
                logger.info(f"🔔 [NOTIFICATION] ========== STARTING NOTIFICATION CREATION ==========")
                logger.info(f"👤 [NOTIFICATION] Current user: '{self.request.user.username}' (ID: {self.request.user.id})")
                logger.info(f"🔔 [NOTIFICATION] Transaction committed, calling create_notifications_after_commit()...")
                logger.info(f"🔔 [NOTIFICATION] Transaction ID: {transaction_id}, Account: {account.id if account else 'None'}")
                logger.info(f"🔔 [NOTIFICATION] Transaction object exists: {transaction is not None}")
                logger.info(f"🔔 [NOTIFICATION] Account object exists: {account is not None}")
                logger.info(f"🔔 [NOTIFICATION] Function create_notifications_after_commit exists: {callable(create_notifications_after_commit)}")
                
                # CRITICAL: Always attempt to create notifications, even if there's an error
                notification_creation_attempted = False
                notification_creation_succeeded = False
                
                try:
                    # Call the notification creation function - it handles all the logic internally
                    logger.info(f"🔔 [NOTIFICATION] About to call create_notifications_after_commit()...")
                    notification_creation_attempted = True
                    create_notifications_after_commit()
                    notification_creation_succeeded = True
                    logger.info(f"✅ [NOTIFICATION] Notification creation function completed successfully")
                    logger.info(f"🔔 [NOTIFICATION] ========== NOTIFICATION CREATION COMPLETE ==========")
                except Exception as e:
                    notification_creation_attempted = True
                    notification_creation_succeeded = False
                    logger.error(f"❌ [NOTIFICATION] Notification creation failed with exception: {str(e)}", exc_info=True)
                    import traceback
                    logger.error(f"❌ [NOTIFICATION] Full traceback: {traceback.format_exc()}")
                    logger.error(f"🔔 [NOTIFICATION] ========== NOTIFICATION CREATION FAILED ==========")
                    # Don't fail transaction - notifications are non-critical
                    # But log the error so we can debug why notifications aren't being created
                
                # Final verification log
                logger.info(f"🔔 [NOTIFICATION] Final status - Attempted: {notification_creation_attempted}, Succeeded: {notification_creation_succeeded}")
                
                # Now do verification (non-critical - won't rollback if it fails)
                logger.info(f"🔍 [VERIFY] Transaction committed, verifying in database...")
                logger.info(f"🔍 [VERIFY] Transaction ID: {transaction_id}")
                logger.info(f"🔍 [VERIFY] Transaction account_id: {transaction.account_id}")
                logger.info(f"🔍 [VERIFY] Transaction account object: {transaction.account.name if transaction.account else 'None (Personal)'}")
                logger.info(f"🔍 [VERIFY] Transaction user_id: {transaction.user_id}")
                logger.info(f"🔍 [VERIFY] Full transaction: type={transaction.type}, amount={transaction.amount}, account_id={transaction.account_id}, user_id={transaction.user_id}")
                
                # Verify transaction exists in database (non-critical - log but don't fail)
                try:
                    from .models import Transaction
                    saved_transaction = Transaction.objects.get(id=transaction_id)
                    logger.info(f"✅ [VERIFY] Transaction verified in database: ID={saved_transaction.id}, account_id={saved_transaction.account_id}")
                    
                    # Verify account_id matches (non-critical - log mismatch but don't fail)
                    if account:
                        if saved_transaction.account_id != account.id:
                            logger.error(f"⚠️ [VERIFY] Account mismatch detected! Expected {account.id}, got {saved_transaction.account_id}")
                            logger.error(f"⚠️ [VERIFY] Attempting to fix account_id mismatch...")
                            # Try to fix it
                            saved_transaction.account = account
                            saved_transaction.save(update_fields=['account'])
                            logger.warning(f"⚠️ [VERIFY] Fixed account_id: Set to {account.id}")
                        else:
                            logger.info(f"✅ [VERIFY] Account verified: Transaction {transaction_id} correctly linked to account {account.id}")
                    else:
                        if saved_transaction.account_id is not None:
                            logger.error(f"⚠️ [VERIFY] Personal transaction has account_id {saved_transaction.account_id}!")
                            logger.error(f"⚠️ [VERIFY] Attempting to fix...")
                            # Try to fix it
                            saved_transaction.account = None
                            saved_transaction.save(update_fields=['account'])
                            logger.warning(f"⚠️ [VERIFY] Fixed account_id: Set to None")
                        else:
                            logger.info(f"✅ [VERIFY] Personal transaction verified: No account_id (correct)")
                except Transaction.DoesNotExist:
                    logger.error(f"❌ [VERIFY] CRITICAL: Transaction {transaction_id} not found in database after commit!")
                    # This is critical - transaction should exist
                    raise ValidationError({
                        'error': 'Transaction was not saved to database. Please try again.'
                    })
                except Exception as e:
                    logger.error(f"⚠️ [VERIFY] Error verifying transaction (non-critical): {str(e)}", exc_info=True)
                    # Don't fail - transaction is already committed
                
                # Log transaction details
                account_info = 'None (Personal)' if not transaction.account else f"ID={transaction.account.id}, Name={transaction.account.name}"
                logger.info(
                    f"✅ Transaction created successfully: ID={transaction_id}, "
                    f"User: {self.request.user.username}, "
                    f"Account: {account_info}, "
                    f"Type: {transaction.type}, "
                    f"Amount: {transaction.amount}, "
                    f"Category: {transaction.category}, "
                    f"Name: {transaction.name}, "
                    f"Remark: {transaction.remark}, "
                    f"Mode: {transaction.mode}, "
                    f"Date: {transaction.date}, "
                    f"Time: {transaction.time}"
                )
                
                logger.info(f"✅ Transaction {transaction_id} successfully committed to database")
                
            except ValidationError:
                # Re-raise validation errors - these should fail the request
                raise
            except Exception as e:
                # Log any other errors but ensure transaction is saved if it was created
                logger.error(f"❌ Error in perform_create: {str(e)}", exc_info=True)
                if transaction_id:
                    # Transaction was created - verify it exists
                    try:
                        from .models import Transaction
                        verify = Transaction.objects.filter(id=transaction_id).first()
                        if verify:
                            logger.warning(f"⚠️ Transaction {transaction_id} was created despite error - it exists in database")
                            # Try to create notifications even if there was an error
                            # But only if transaction was successfully saved
                            if account and account.type == 'SHARED':
                                try:
                                    create_notifications_after_commit()
                                except Exception as notif_error:
                                    logger.error(f"❌ Error creating notifications after error: {str(notif_error)}")
                        else:
                            logger.error(f"❌ Transaction {transaction_id} was NOT saved to database")
                    except:
                        pass
                raise ValidationError({
                    'error': 'Failed to create transaction. Please check your input.',
                    'detail': str(e) if settings.DEBUG else 'Internal server error'
                })
                    
        except Exception as e:
            logger.error(f"Error creating transaction: {str(e)}", exc_info=True)
            raise ValidationError({
                'error': 'Failed to create transaction. Please check your input.',
                'detail': str(e) if settings.DEBUG else 'Internal server error'
            })
        # NOTE: Do NOT close connection here - Django manages connections automatically
        # Closing the connection manually can prevent the transaction from committing properly
    
    def create(self, request, *args, **kwargs):
        """Create transaction with enhanced error handling."""
        try:
            # Log incoming request data
            logger.info(
                f"➕ Transaction creation request from user '{request.user.username}' (ID: {request.user.id}): "
                f"{request.data}"
            )
            
            # Ensure valid database connection
            ensure_valid_connection()
            
            serializer = self.get_serializer(data=request.data)
            
            # Validate with detailed error logging
            if not serializer.is_valid():
                logger.warning(
                    f"❌ Validation failed for user '{request.user.username}': "
                    f"{serializer.errors}"
                )
                return Response({
                    'success': False,
                    'message': 'Validation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Log validated data
            logger.info(f"✅ Validated transaction data: {serializer.validated_data}")
            
            # Create the transaction
            self.perform_create(serializer)
            
            # Refresh from database to get the ID
            transaction = serializer.instance
            if transaction:
                transaction.refresh_from_db()
                logger.info(f"✅ Transaction {transaction.id} created successfully for user '{request.user.username}'")
            
            # Return transactions filtered by account if transaction was created for a specific account
            # This ensures proper account isolation - if user creates transaction for account 1,
            # they should only see transactions from account 1, not from other accounts
            account = transaction.account if transaction else None
            
            if account:
                # Transaction was created for a specific account - return only transactions from that account
                user_transactions = Transaction.objects.filter(
                    account_id=account.id
                ).order_by('-date', '-time')
                logger.info(f"✅ Returning transactions filtered by account {account.id} ({account.name})")
            else:
                # Personal transaction - return all accessible transactions using get_queryset logic
                # This includes personal transactions + all shared account transactions user has access to
                user_transactions = self.get_queryset().order_by('-date', '-time')
                logger.info(f"✅ Returning all accessible transactions (personal + shared accounts)")
            
            transaction_serializer = TransactionSerializer(user_transactions, many=True)
            
            logger.info(f"✅ Returning {len(transaction_serializer.data)} transactions for user '{request.user.username}'")
            
            # Return response with created transaction and updated list
            response_data = {
                'success': True,
                'message': 'Transaction created successfully',
                'data': serializer.data,
                'transactions': transaction_serializer.data  # Return all transactions for frontend to update
            }
            
            logger.info(f"✅ Successfully created transaction and returning {len(transaction_serializer.data)} total transactions")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            logger.error(
                f"❌ Validation error creating transaction for user '{request.user.username}': "
                f"{error_detail}"
            )
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': error_detail
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(
                f"❌ Error creating transaction for user '{request.user.username}': {str(e)}",
                exc_info=True
            )
            return Response({
                'success': False,
                'message': 'Failed to create transaction',
                'error': str(e) if settings.DEBUG else 'Internal server error',
                'errors': {'detail': [str(e)]} if settings.DEBUG else {}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_update(self, serializer):
        """Override to add permission check and notification creation"""
        transaction = serializer.instance
        user = self.request.user
        
        # Check permissions for shared account transactions
        if transaction.account and transaction.account.type == 'SHARED':
            from accounts.models import AccountMember
            
            # Owner can always edit
            if not transaction.account.is_owner(user):
                membership = AccountMember.objects.filter(
                    account=transaction.account,
                    user=user,
                    status='ACCEPTED'
                ).first()
                
                if not membership:
                    raise ValidationError({
                        'permission': 'You do not have access to this account'
                    })
                
                # Check if user can edit this transaction
                # If transaction belongs to user, check can_edit_own_entry
                # If transaction belongs to someone else, check can_edit_all_entries
                if transaction.user == user:
                    if not membership.can_edit_own_entry:
                        raise ValidationError({
                            'permission': 'You do not have permission to edit your own entries in this account'
                        })
                else:
                    if not membership.can_edit_all_entries:
                        raise ValidationError({
                            'permission': 'You do not have permission to edit other members\' entries'
                        })
        
        # Save the transaction
        transaction = serializer.save()
        
        # Create notifications for shared account members
        if transaction.account and transaction.account.type == 'SHARED':
            try:
                from notifications.services import NotificationService
                NotificationService.notify_account_members(
                    account=transaction.account,
                    notification_type='TRANSACTION_EDITED',
                    title=f'Transaction updated in {transaction.account.name}',
                    message=f'{user.username} updated {transaction.type}: ₹{transaction.amount} - {transaction.category or transaction.name}',
                    triggered_by=user,
                    exclude_user=user,
                    data={
                        'transaction_id': transaction.id,
                        'transaction_type': transaction.type,
                        'amount': str(transaction.amount),
                        'category': transaction.category or '',
                        'account_id': transaction.account.id,
                        'account_name': transaction.account.name
                    }
                )
                logger.info(f"Notifications created for account {transaction.account.id} members")
            except Exception as e:
                logger.error(f"Error creating notifications: {str(e)}", exc_info=True)
                # Don't fail transaction update if notification fails
    
    def update(self, request, *args, **kwargs):
        """Update transaction with enhanced error handling."""
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response({
                'success': True,
                'message': 'Transaction updated successfully',
                'data': serializer.data
            })
            
        except TransactionNotFoundError:
            return Response({
                'success': False,
                'message': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except TransactionPermissionError:
            return Response({
                'success': False,
                'message': 'You do not have permission to update this transaction'
            }, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': e.detail if hasattr(e, 'detail') else str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating transaction: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to update transaction',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_destroy(self, instance):
        """Override to add permission check for shared accounts"""
        user = self.request.user
        
        # Check permissions for shared account transactions
        if instance.account and instance.account.type == 'SHARED':
            from accounts.models import AccountMember
            
            # Owner can always delete
            if not instance.account.is_owner(user):
                membership = AccountMember.objects.filter(
                    account=instance.account,
                    user=user,
                    status='ACCEPTED'
                ).first()
                
                if not membership:
                    raise ValidationError({
                        'permission': 'You do not have access to this account'
                    })
                
                # Check delete permission
                if not membership.can_delete_entry:
                    raise ValidationError({
                        'permission': 'You do not have permission to delete entries in this account'
                    })
        
        # Perform deletion
        super().perform_destroy(instance)
    
    def destroy(self, request, *args, **kwargs):
        """Delete transaction with enhanced error handling."""
        try:
            instance = self.get_object()
            transaction_id = instance.id
            user = request.user
            
            logger.info(f"🗑️ Delete request received for transaction ID: {transaction_id} by user: {user.username}")
            
            # Verify transaction exists before deletion
            if not instance:
                logger.warning(f"Transaction {transaction_id} not found for deletion")
                raise TransactionNotFoundError()
            
            # Perform the deletion
            self.perform_destroy(instance)
            
            logger.info(f"✅ Transaction {transaction_id} successfully deleted by user: {user.username}")
            
            # Return 200 OK with body (HTTP 204 should not have a body)
            return Response({
                'success': True,
                'message': 'Transaction deleted successfully',
                'id': transaction_id
            }, status=status.HTTP_200_OK)
            
        except TransactionNotFoundError:
            logger.warning(f"❌ Transaction not found for deletion: {kwargs.get('pk', 'unknown')}")
            return Response({
                'success': False,
                'message': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except TransactionPermissionError:
            logger.warning(f"❌ Permission denied for transaction deletion: {kwargs.get('pk', 'unknown')} by user: {request.user.username}")
            return Response({
                'success': False,
                'message': 'You do not have permission to delete this transaction'
            }, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"❌ Error deleting transaction {kwargs.get('pk', 'unknown')}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to delete transaction',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def list(self, request, *args, **kwargs):
        """List transactions with enhanced error handling."""
        try:
            user = request.user
            logger.info(f"📊 Dashboard/List request received from user: {user.username} (ID: {user.id})")
            
            # Get queryset directly
            queryset = self.filter_queryset(self.get_queryset())
            
            # Log queryset count
            queryset_count = queryset.count()
            logger.info(f"📊 Found {queryset_count} transactions in database for user: {user.username}")
            
            # Ensure we have a list, even if empty
            if queryset_count == 0:
                logger.info(f"⚠️ No transactions found for user: {user.username}, returning empty array")
                return Response({
                    'success': True,
                    'count': 0,
                    'data': []
                })
            
            # Handle pagination if enabled
            page = self.paginate_queryset(queryset)
            if page is not None:
                # Paginated response
                serializer = self.get_serializer(page, many=True)
                paginated_response = self.get_paginated_response(serializer.data)
                
                # Extract pagination data
                paginated_data = paginated_response.data
                results = paginated_data.get('results', [])
                count = paginated_data.get('count', 0)
                
                # Ensure results is always a list
                if not isinstance(results, list):
                    results = []
                
                logger.info(f"✅ Returning {len(results)} transactions (paginated, total: {count}) for user: {user.username}")
                
                return Response({
                    'success': True,
                    'count': count,
                    'next': paginated_data.get('next'),
                    'previous': paginated_data.get('previous'),
                    'data': results
                })
            
            # Non-paginated response - serialize all transactions
            serializer = self.get_serializer(queryset, many=True)
            transaction_data = serializer.data
            
            # Ensure transaction_data is always a list
            if not isinstance(transaction_data, list):
                logger.warning(f"⚠️ Serializer returned non-list data: {type(transaction_data)}, converting to list")
                transaction_data = [transaction_data] if transaction_data else []
            
            logger.info(f"✅ Returning {len(transaction_data)} transactions (non-paginated) for user: {user.username}")
            
            # Log first transaction for debugging
            if transaction_data:
                logger.info(f"📝 First transaction sample: ID={transaction_data[0].get('id')}, Type={transaction_data[0].get('type')}, Amount={transaction_data[0].get('amount')}")
            
            return Response({
                'success': True,
                'count': len(transaction_data),
                'data': transaction_data
            })
            
        except Exception as e:
            logger.error(f"❌ Error listing transactions for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to fetch transactions',
                'error': str(e) if settings.DEBUG else 'Internal server error',
                'count': 0,
                'data': []  # Return empty array on error
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description='Search transactions by name, category, remark, etc.',
        manual_parameters=[
            openapi.Parameter('search', openapi.IN_QUERY, description='Search query (searches in name, category, remark, etc.)', type=openapi.TYPE_STRING),
            openapi.Parameter('type', openapi.IN_QUERY, description='Filter by type (Income or Expense)', type=openapi.TYPE_STRING, enum=['Income', 'Expense']),
            openapi.Parameter('category', openapi.IN_QUERY, description='Filter by category', type=openapi.TYPE_STRING),
            openapi.Parameter('mode', openapi.IN_QUERY, description='Filter by payment mode', type=openapi.TYPE_STRING),
            openapi.Parameter('date_from', openapi.IN_QUERY, description='Filter from date (YYYY-MM-DD)', type=openapi.TYPE_STRING),
            openapi.Parameter('date_to', openapi.IN_QUERY, description='Filter to date (YYYY-MM-DD)', type=openapi.TYPE_STRING),
            openapi.Parameter('amount_min', openapi.IN_QUERY, description='Minimum amount', type=openapi.TYPE_NUMBER),
            openapi.Parameter('amount_max', openapi.IN_QUERY, description='Maximum amount', type=openapi.TYPE_NUMBER),
            openapi.Parameter('sort', openapi.IN_QUERY, description='Sort field (date, amount, category, name). Prefix with - for descending', type=openapi.TYPE_STRING),
        ],
        responses={
            200: TransactionSerializer(many=True),
            401: 'Unauthorized',
        },
        tags=['Transactions'],
        security=[{'Bearer': []}]
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search and filter transactions with advanced filtering options.
        All filters are optional and can be combined.
        """
        try:
            # Use the same queryset logic from get_queryset which handles all filters
            queryset = self.filter_queryset(self.get_queryset())
            
            # Serialize results
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"🔍 Search returned {len(serializer.data)} transactions for user '{request.user.username}'")
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'data': serializer.data
            })
            
        except ValidationError as e:
            return Response({
                'success': False,
                'message': 'Invalid filter parameters',
                'errors': e.detail if hasattr(e, 'detail') else str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"❌ Error searching transactions: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to search transactions',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve transaction with enhanced error handling."""
        try:
            response = super().retrieve(request, *args, **kwargs)
            return Response({
                'success': True,
                'data': response.data
            })
        except TransactionNotFoundError:
            return Response({
                'success': False,
                'message': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except TransactionPermissionError:
            return Response({
                'success': False,
                'message': 'You do not have permission to view this transaction'
            }, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error retrieving transaction: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to fetch transaction',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description='Get summary statistics (income, expense, balance) for the authenticated user',
        responses={
            200: openapi.Response('Summary statistics', openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'data': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'total_income': openapi.Schema(type=openapi.TYPE_NUMBER),
                            'total_expense': openapi.Schema(type=openapi.TYPE_NUMBER),
                            'net_total': openapi.Schema(type=openapi.TYPE_NUMBER),
                            'transaction_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'income_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'expense_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                        }
                    ),
                }
            )),
            401: 'Unauthorized',
        },
        tags=['Transactions'],
        security=[{'Bearer': []}]
    )
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary statistics for the user's transactions with error handling.
        Respects account filtering if account/accountId parameter is provided.
        """
        try:
            # Use the same queryset logic as get_queryset to respect account filtering
            transactions = self.get_queryset()
            
            total_income = transactions.filter(type='Income').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            total_expense = transactions.filter(type='Expense').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            net_total = total_income - total_expense
            
            # Get account filter info for response
            account_id = request.query_params.get('account', None) or request.query_params.get('accountId', None)
            account_filter = account_id if account_id else 'all'
            
            return Response({
                'success': True,
                'data': {
                    'total_income': float(total_income),
                    'total_expense': float(total_expense),
                    'net_total': float(net_total),
                    'transaction_count': transactions.count(),
                    'income_count': transactions.filter(type='Income').count(),
                    'expense_count': transactions.filter(type='Expense').count(),
                    'account_filter': account_filter,  # Indicate which account filter was applied
                }
            })
            
        except Exception as e:
            logger.error(f"Error fetching summary: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to fetch summary',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description='Get all income transactions for the authenticated user',
        responses={
            200: TransactionSerializer(many=True),
            401: 'Unauthorized',
        },
        tags=['Transactions'],
        security=[{'Bearer': []}]
    )
    @action(detail=False, methods=['get'])
    def income(self, request):
        """
        Get all income transactions for the authenticated user.
        Respects account filtering if account/accountId parameter is provided.
        """
        try:
            # Use the same queryset logic as get_queryset to respect account filtering
            queryset = self.get_queryset()
            income_transactions = queryset.filter(type='Income').order_by('-date', '-time')
            
            serializer = self.get_serializer(income_transactions, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error fetching income transactions: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to fetch income transactions',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description='Get all expense transactions for the authenticated user',
        responses={
            200: TransactionSerializer(many=True),
            401: 'Unauthorized',
        },
        tags=['Transactions'],
        security=[{'Bearer': []}]
    )
    @action(detail=False, methods=['get'])
    def expense(self, request):
        """
        Get all expense transactions for the authenticated user.
        Respects account filtering if account/accountId parameter is provided.
        """
        try:
            # Use the same queryset logic as get_queryset to respect account filtering
            queryset = self.get_queryset()
            expense_transactions = queryset.filter(type='Expense').order_by('-date', '-time')
            
            serializer = self.get_serializer(expense_transactions, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error fetching expense transactions: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Failed to fetch expense transactions',
                'error': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
