# Mobile App Backend Connection Setup

## Backend URLs

**Base URL:**
```
https://cashbook-backend-2.onrender.com
```

**API Base URL:**
```
https://cashbook-backend-2.onrender.com/api
```

## Mobile App Configuration

### 1. Set Backend URL in Mobile App

In your mobile app (`cashbook-mobile`), you need to configure the backend URL.

**Common locations:**
- `src/config/api.js`
- `src/services/api.js`
- `.env` file
- `app.json` (for Expo)

**Example configuration:**
```javascript
// src/config/api.js or similar
export const API_BASE_URL = 'https://cashbook-backend-2.onrender.com/api';
export const BACKEND_URL = 'https://cashbook-backend-2.onrender.com';
```

### 2. Update CORS in Render Dashboard

**Important:** Mobile apps don't send Origin headers, so we need to allow all origins.

1. Go to Render Dashboard → Your Service → Environment
2. Add/Update these environment variables:

```
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=https://your-frontend.com,https://your-mobile-app.com
```

### 3. Test Backend Connection

**Test from command line:**
```powershell
# Test auth status endpoint
curl https://cashbook-backend-2.onrender.com/api/auth/status/

# Test registration
curl -X POST https://cashbook-backend-2.onrender.com/api/register/ `
  -H "Content-Type: application/json" `
  -d '{"username":"testuser","password":"testpass123","password_confirm":"testpass123"}'
```

**Test from mobile app:**
1. Open mobile app
2. Try to register or login
3. Check network logs/console for API calls
4. Verify requests are going to `https://cashbook-backend-2.onrender.com/api/...`

## Common Issues

### Issue 1: "Network request failed"
**Cause:** Backend URL not configured or wrong URL  
**Fix:** Check mobile app API config, verify URL is `https://cashbook-backend-2.onrender.com/api`

### Issue 2: "CORS error"
**Cause:** CORS not allowing mobile app requests  
**Fix:** Set `CORS_ALLOW_ALL_ORIGINS=True` in Render Dashboard

### Issue 3: "Connection timeout"
**Cause:** Backend is down or not deployed  
**Fix:** Check Render Dashboard, verify service is "Live"

### Issue 4: "401 Unauthorized"
**Cause:** Missing or invalid JWT token  
**Fix:** Login first to get token, then use in Authorization header

## API Endpoints for Mobile App

### Authentication (No token required)
- `POST /api/register/` - Register new user
- `POST /api/token/` - Login (get JWT tokens)
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/token/verify/` - Verify token
- `GET /api/auth/status/` - Check auth status

### Protected Endpoints (Require JWT token)
- `GET /api/user/` - Get user profile
- `PUT /api/user/` - Update profile
- `POST /api/password/change/` - Change password
- `POST /api/logout/` - Logout
- `GET /api/transactions/` - List transactions
- `POST /api/transactions/` - Create transaction
- `GET /api/transactions/summary/` - Get summary

## Request Headers

**For protected endpoints:**
```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

## Example API Call (JavaScript/React Native)

```javascript
// Login example
const login = async (username, password) => {
  try {
    const response = await fetch('https://cashbook-backend-2.onrender.com/api/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Get transactions (with token)
const getTransactions = async (token) => {
  try {
    const response = await fetch('https://cashbook-backend-2.onrender.com/api/transactions/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get transactions error:', error);
    throw error;
  }
};
```

## Next Steps

1. **Update mobile app config** with backend URL
2. **Set CORS_ALLOW_ALL_ORIGINS=True** in Render Dashboard
3. **Test connection** from mobile app
4. **Check network logs** for API calls
5. **Verify backend is live** and accessible

