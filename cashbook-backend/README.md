# Cashbook Backend API

Django REST Framework backend for Cashbook mobile application.

## Project Structure

```
cashbook-backend/
├── settings.py            # Django settings (PostgreSQL only)
├── urls.py                # URL routing
├── wsgi.py                # WSGI configuration
├── asgi.py                # ASGI configuration
├── manage.py              # Django management script
├── transactions/          # Transactions Django app
│   ├── models.py          # Transaction and UserCustomField models
│   ├── views.py           # API views
│   ├── serializers.py     # DRF serializers
│   ├── urls.py            # App URL patterns
│   └── migrations/        # Database migrations
├── manage.py              # Django management script
├── requirements.txt       # Python dependencies
├── Procfile              # Deployment configuration (Render)
├── runtime.txt           # Python version
└── render.yaml           # Render deployment config
```

## Features

- ✅ PostgreSQL database (required, no SQLite)
- ✅ JWT authentication
- ✅ User registration and login
- ✅ Transaction CRUD operations
- ✅ User-isolated transactions
- ✅ Custom fields support
- ✅ Production-ready settings

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file or set environment variables:

```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,*.onrender.com
DATABASE_URL=postgresql://user:password@host:port/database
CORS_ALLOWED_ORIGINS=https://your-frontend.com
```

### 3. Database Setup

```bash
# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 4. Run Server

```bash
# Development
python manage.py runserver

# Production (using Gunicorn)
gunicorn wsgi:application
```

## API Endpoints

### Authentication
- `POST /api/register/` - Register new user
- `POST /api/token/` - Login (get JWT tokens)
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/token/verify/` - Verify if JWT token is valid
- `POST /api/logout/` - Logout (blacklist token)
- `GET /api/user/` - Get current user profile
- `PUT /api/user/` - Update current user profile
- `POST /api/password/change/` - Change user password

### Transactions
- `GET /api/transactions/` - List user transactions
- `POST /api/transactions/` - Create transaction
- `GET /api/transactions/{id}/` - Get transaction
- `PUT /api/transactions/{id}/` - Update transaction
- `DELETE /api/transactions/{id}/` - Delete transaction
- `GET /api/transactions/summary/` - Get summary
- `GET /api/transactions/income/` - Get income transactions
- `GET /api/transactions/expense/` - Get expense transactions

### Custom Fields
- `GET /api/custom-fields/` - Get user custom fields
- `POST /api/custom-fields/` - Create custom field

## Database

**PostgreSQL Only** - SQLite is not supported.

The application uses PostgreSQL for all data storage:
- User accounts (`auth_user` table)
- Transactions (`transactions_transaction` table)
- Custom fields (`transactions_usercustomfield` table)

## Deployment

### Render

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically on push

The `Procfile` and `render.yaml` are configured for Render deployment.

## Security

- ✅ JWT token authentication
- ✅ Password hashing (Django default)
- ✅ CORS configured for production
- ✅ SSL/TLS required for PostgreSQL
- ✅ Security headers enabled
- ✅ Token blacklisting on logout

## Development

```bash
# Check configuration
python manage.py check

# Run migrations
python manage.py migrate

# Create migrations
python manage.py makemigrations

# Run tests (if available)
python manage.py test
```

## License

Private project - All rights reserved.
