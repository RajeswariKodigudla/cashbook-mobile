"""
URL configuration for cashbook project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from transactions.custom_token_view import CustomTokenObtainPairView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions


def api_root(request):
    """API root endpoint showing available endpoints."""
    return JsonResponse({
        'message': 'Cashbook API',
        'version': '1.0.0',
        'status': 'active',
        'authentication': {
            'configured': True,
            'message': 'Authentication endpoints are configured and available',
            'endpoints': {
                'status': '/api/auth/status/',
                'register': '/api/register/',
                'login': '/api/token/',
                'token_refresh': '/api/token/refresh/',
                'token_verify': '/api/token/verify/',
                'logout': '/api/logout/',
                'user_profile': '/api/user/',
                'change_password': '/api/password/change/',
            }
        },
        'endpoints': {
            'authentication': {
                'status': '/api/auth/status/',
                'register': '/api/register/',
                'login': '/api/token/',
                'token_refresh': '/api/token/refresh/',
                'token_verify': '/api/token/verify/',
                'logout': '/api/logout/',
                'user_profile': '/api/user/',
                'change_password': '/api/password/change/',
            },
            'transactions': {
                'list': '/api/transactions/',
                'create': '/api/transactions/',
                'detail': '/api/transactions/{id}/',
                'update': '/api/transactions/{id}/',
                'delete': '/api/transactions/{id}/',
                'search': '/api/transactions/search/',
                'summary': '/api/transactions/summary/',
                'income': '/api/transactions/income/',
                'expense': '/api/transactions/expense/',
            },
            'accounts': {
                'list': '/api/accounts/',
                'create': '/api/accounts/',
                'detail': '/api/accounts/{id}/',
                'members': '/api/accounts/{id}/members/',
                'invite': '/api/accounts/{id}/invite/',
                'invitations': '/api/accounts/invitations/',
            },
            'notifications': {
                'list': '/api/notifications/',
                'detail': '/api/notifications/{id}/',
                'mark_read': '/api/notifications/{id}/read/',
                'mark_all_read': '/api/notifications/mark-all-read/',
                'unread_count': '/api/notifications/unread-count/',
            },
            'custom_fields': {
                'list': '/api/custom-fields/',
                'create': '/api/custom-fields/',
            },
            'admin': '/admin/',
            'health': '/api/health/',
        },
        'documentation': {
            'swagger': '/swagger/',
            'redoc': '/redoc/',
            'openapi_schema': '/swagger.json',
            'openapi_yaml': '/swagger.yaml',
        }
    })


# Swagger/OpenAPI Schema View
schema_view = get_schema_view(
    openapi.Info(
        title="Cashbook API",
        default_version='v1',
        description="""
        Cashbook Backend API Documentation
        
        ## Authentication
        Most endpoints require JWT authentication. 
        1. Register a new user at `/api/register/`
        2. Login at `/api/token/` to get access and refresh tokens
        3. Use the access token in the Authorization header: `Bearer <token>`
        4. Refresh your token at `/api/token/refresh/` when it expires
        
        ## Transactions
        All transaction endpoints are user-isolated. Users can only access their own transactions.
        
        ## Custom Fields
        Users can define custom fields for their transactions at the user level.
        """,
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="support@cashbook.com"),
        license=openapi.License(name="Private License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    validators=['flex', 'ssv'],
)


urlpatterns = [
    # Swagger/OpenAPI Documentation URLs (MUST BE FIRST to avoid conflicts)
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # API endpoints
    path('', api_root, name='api_root'),
    path('api/', api_root, name='api_root_alt'),  # Alternative path for API root
    path('api/health/', api_root, name='api_health'),  # Health check endpoint
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('transactions.urls')),
    path('api/', include('accounts.urls')),
    path('api/', include('notifications.urls')),
]

# Debug: Print URL patterns when DEBUG is True
if settings.DEBUG:
    import sys
    print(f"[DEBUG] Loaded {len(urlpatterns)} URL patterns", file=sys.stderr)
    for i, pattern in enumerate(urlpatterns[:5], 1):
        print(f"[DEBUG]   {i}. {pattern.pattern if hasattr(pattern, 'pattern') else str(pattern)}", file=sys.stderr)

# Serve static files in development (for Swagger UI)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

