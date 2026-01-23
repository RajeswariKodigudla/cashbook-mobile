"""
Django settings for cashbook project - Production Ready
"""

from pathlib import Path
from datetime import timedelta
import os
from urllib.parse import urlparse

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent

# ============================================================
# SECURITY SETTINGS - Production Ready
# ============================================================

# SECRET_KEY - Must be set via environment variable in production
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-change-this-in-production-CHANGE-THIS-NOW'
)

# DEBUG - Set to False in production via environment variable
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# ALLOWED_HOSTS - Set via environment variable (comma-separated)
ALLOWED_HOSTS_STR = os.getenv(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1,*.onrender.com,*.pythonanywhere.com'
)

ALLOWED_HOSTS = [
    host.strip() for host in ALLOWED_HOSTS_STR.split(',') if host.strip()
]

# ============================================================
# APPLICATION DEFINITION
# ============================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_yasg',  # Swagger/OpenAPI documentation
    'accounts',  # Must be before transactions
    'notifications',
    'transactions',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # For static files in production
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'middleware.ContentTypeCharsetMiddleware',  # Ensure Content-Type includes charset=utf-8
    'middleware.DatabaseConnectionMiddleware',  # Close DB connections after each request to prevent pool exhaustion
]

ROOT_URLCONF = 'urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'wsgi.application'

# ============================================================
# DATABASE CONFIGURATION - PostgreSQL ONLY (No SQLite)
# ============================================================

# CRITICAL: This project uses PostgreSQL ONLY. No SQLite fallback.

# Check if psycopg2 is available
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    raise ImportError(
        "CRITICAL: psycopg2 is required for PostgreSQL. "
        "Install it with: pip install psycopg2-binary"
    )

# PostgreSQL Database Configuration
# Priority: DATABASE_URL > Individual env vars > Defaults
DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL:
    # Parse DATABASE_URL
    parsed = urlparse(DATABASE_URL)
    db_user = parsed.username or os.getenv('DB_USER', 'cashbook')
    db_password = parsed.password or os.getenv('DB_PASSWORD', 'Y0FxCK1korZdZIROIxaJxPUMUqJYA1kn')
    db_host = parsed.hostname or os.getenv('DB_HOST', 'dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com')
    db_port = parsed.port or os.getenv('DB_PORT', '5432')
    db_name = parsed.path.lstrip('/') or os.getenv('DB_NAME', 'cashbook_os9o')
else:
    # Use individual environment variables or defaults
    db_user = os.getenv('DB_USER', 'cashbook')
    db_password = os.getenv('DB_PASSWORD', 'Y0FxCK1korZdZIROIxaJxPUMUqJYA1kn')
    db_host = os.getenv('DB_HOST', 'dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'cashbook_os9o')

# STRICTLY PostgreSQL - NO SQLite, NO other databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_name,
        'USER': db_user,
        'PASSWORD': db_password,
        'HOST': db_host,
        'PORT': db_port,
        'OPTIONS': {
            'connect_timeout': 10,
            'sslmode': 'require',  # Required for Render PostgreSQL
            # Keep connections alive to prevent premature closure
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
            # Additional connection stability options
            'options': '-c statement_timeout=30000',  # 30 second statement timeout
        },
        # Connection pooling - CRITICAL: Keep connections short-lived to prevent pool exhaustion
        # With connection count 2/2, we need to close connections more aggressively
        'CONN_MAX_AGE': 0,  # Close connections immediately after use to prevent pool exhaustion
        'AUTOCOMMIT': True,
        # Ensure connections are properly validated
        'ATOMIC_REQUESTS': False,  # Don't wrap each request in a transaction
    }
}

# CRITICAL CHECK: Ensure PostgreSQL is being used
if 'postgresql' not in DATABASES['default']['ENGINE'].lower():
    raise ValueError(
        f"CRITICAL ERROR: Database engine must be PostgreSQL! "
        f"Found: {DATABASES['default']['ENGINE']}. "
        f"This project does NOT support SQLite or other databases."
    )

# CRITICAL CHECK: Ensure no SQLite
if 'sqlite' in DATABASES['default']['ENGINE'].lower():
    raise ValueError(
        "CRITICAL ERROR: SQLite is NOT allowed! "
        f"Current engine: {DATABASES['default']['ENGINE']}. "
        "This project uses PostgreSQL ONLY."
    )

# Log database configuration (without password) - only in development
if DEBUG:
    print(f"[DATABASE] Connecting to PostgreSQL: {db_user}@{db_host}:{db_port}/{db_name}")
    print(f"[DATABASE] Engine: {DATABASES['default']['ENGINE']}")

# ============================================================
# SWAGGER/OPENAPI CONFIGURATION
# ============================================================

SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        }
    },
    'USE_SESSION_AUTH': False,
    'JSON_EDITOR': True,
    'SUPPORTED_SUBMIT_METHODS': ['get', 'post', 'put', 'delete', 'patch'],
    'OPERATIONS_SORTER': 'alpha',
    'TAGS_SORTER': 'alpha',
    'DOC_EXPANSION': 'none',
    'DEEP_LINKING': True,
    'SHOW_EXTENSIONS': True,
    'DEFAULT_MODEL_RENDERING': 'example',
}

REDOC_SETTINGS = {
    'LAZY_RENDERING': False,
    'HIDE_HOSTNAME': False,
    'EXPAND_RESPONSES': '200,201',
    'PATH_IN_MIDDLE': True,
}

# Log database configuration (without password) - only in development
if DEBUG:
    print(f"[DATABASE] Connecting to PostgreSQL: {db_user}@{db_host}:{db_port}/{db_name}")


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#password-validation

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'

# Static files root directory for production
STATIC_ROOT = str(os.path.abspath(os.path.join(BASE_DIR, 'staticfiles')))

# Ensure staticfiles directory exists
try:
    os.makedirs(STATIC_ROOT, exist_ok=True)
except Exception as e:
    if DEBUG:
        print(f"[WARNING] Could not create staticfiles directory: {e}")

# WhiteNoise configuration for static files
# Use CompressedStaticFilesStorage (more reliable than Manifest)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# Media files (if needed in future)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# REST FRAMEWORK SETTINGS - Production Ready
# ============================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('API_PAGE_SIZE', '100')),
    'EXCEPTION_HANDLER': 'transactions.exception_handler.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
    # Throttling for production
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('API_THROTTLE_ANON', '100/hour'),
        'user': os.getenv('API_THROTTLE_USER', '1000/hour'),
    },
}

# ============================================================
# JWT SETTINGS - Production Ready
# ============================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        days=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_DAYS', '1'))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', '7'))
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenObtainPairSerializer',
    'TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenRefreshSerializer',
}

# ============================================================
# CORS CONFIGURATION - Production Ready
# ============================================================

# Get allowed origins from environment variable (comma-separated)
CORS_ALLOWED_ORIGINS_STR = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'
)

CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in CORS_ALLOWED_ORIGINS_STR.split(',') if origin.strip()
]

# CORS Configuration for Mobile Apps
# Mobile apps (React Native/Expo) don't send Origin headers, so we need special handling
# Allow all origins if explicitly set, otherwise use specific origins
CORS_ALLOW_ALL_ORIGINS_ENV = os.getenv('CORS_ALLOW_ALL_ORIGINS', '').lower()

if CORS_ALLOW_ALL_ORIGINS_ENV == 'true':
    # Explicitly allow all origins (useful for mobile apps)
    CORS_ALLOW_ALL_ORIGINS = True
elif DEBUG:
    # In development, allow all origins for testing
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # In production, use specific allowed origins
    CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# CORS Preflight cache
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

# ============================================================
# LOGGING CONFIGURATION - Production Ready (Windows Compatible)
# ============================================================

logs_dir = BASE_DIR / 'logs'
logs_dir.mkdir(exist_ok=True)

# Set LOG_LEVEL to reduce noise - use INFO in production, WARNING to suppress DEBUG messages
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO' if not DEBUG else 'INFO')

# Use FileHandler in DEBUG mode (Windows-friendly) and RotatingFileHandler in production
if DEBUG:
    # Development: Simple FileHandler (no rotation, avoids Windows file lock issues)
    file_handler_class = 'logging.FileHandler'
    file_handler_kwargs = {
        'filename': str(logs_dir / 'cashbook.log'),
        'mode': 'a',  # Append mode
        'encoding': 'utf-8',
    }
    error_file_handler_kwargs = {
        'filename': str(logs_dir / 'cashbook_errors.log'),
        'mode': 'a',
        'encoding': 'utf-8',
    }
else:
    # Production: RotatingFileHandler with delay=True
    file_handler_class = 'logging.handlers.RotatingFileHandler'
    file_handler_kwargs = {
        'filename': str(logs_dir / 'cashbook.log'),
        'maxBytes': 1024 * 1024 * 10,  # 10 MB
        'backupCount': 5,
        'delay': True,  # Delay file opening (prevents Windows file lock issues)
    }
    error_file_handler_kwargs = {
        'filename': str(logs_dir / 'cashbook_errors.log'),
        'maxBytes': 1024 * 1024 * 10,  # 10 MB
        'backupCount': 5,
        'delay': True,
    }

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': LOG_LEVEL,
            'class': file_handler_class,
            'formatter': 'verbose',
            **file_handler_kwargs,
        },
        'error_file': {
            'level': 'ERROR',
            'class': file_handler_class,
            'formatter': 'verbose',
            **error_file_handler_kwargs,
        },
        'console': {
            'level': LOG_LEVEL,
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file', 'error_file'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'transactions': {
            'handlers': ['console', 'file', 'error_file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}

# ============================================================
# SECURITY SETTINGS - Production Only
# ============================================================

if not DEBUG:
    # HTTPS settings
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True


# Duplicate INSTALLED_APPS removed - using the one at the top of the file

# ✅ ADD THIS — DO NOT MODIFY ANYTHING ABOVE
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]
