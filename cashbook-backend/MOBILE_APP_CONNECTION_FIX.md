# Mobile App Not Connecting to Backend - Fix Guide

## Issue
Mobile app is not making network calls to the backend API.

## Common Causes & Fixes

### 1. ✅ Backend URL Not Configured in Mobile App

**Check:** Your mobile app needs to have the backend URL configured.

**Backend URL:** `https://cashbook-backend-2.onrender.com`

**API Base URL:** `https://cashbook-backend-2.onrender.com/api`

**Where to check in mobile app:**
- Look for `API_URL`, `BASE_URL`, or `BACKEND_URL` in your mobile app config
- Check `src/services/api.js` or similar API service file
- Check environment variables or config files

**Example mobile app config:**
```javascript
// Should be something like:
const API_BASE_URL = 'https://cashbook-backend-2.onrender.com/api';
// or
const BACKEND_URL = 'https://cashbook-backend-2.onrender.com';
```

### 2. ✅ CORS Configuration Issue

**Problem:** Backend might be blocking requests from mobile app.

**Current CORS setting in env.txt:**
```
CORS_ALLOWED_ORIGINS=https://your-frontend.com,https://your-mobile-app.com
```

**Fix:** Update CORS settings in Render Dashboard:

1. Go to Render Dashboard → Your Service → Environment
2. Find `CORS_ALLOWED_ORIGINS`
3. Update to include your mobile app's origin:
   ```
   https://your-frontend.com,https://your-mobile-app.com,http://localhost:8081,http://localhost:19006
   ```
   (Add localhost ports for development)

**OR** for development, temporarily allow all origins by setting in Render:
```
CORS_ALLOW_ALL_ORIGINS=True
```

### 3. ✅ Backend Not Deployed/Live

**Check if backend is live:**
```powershell
curl https://cashbook-backend-2.onrender.com/api/auth/status/
```

**If it fails:**
- Backend might be down
- Build might have failed
- Check Render Dashboard for service status

### 4. ✅ Network/Internet Connection

**Check:**
- Mobile device has internet connection
- Can access other websites
- Firewall/VPN not blocking requests

### 5. ✅ SSL/HTTPS Certificate Issue

**Check:**
- Backend URL uses `https://` (not `http://`)
- Certificate is valid (Render provides SSL automatically)

### 6. ✅ API Endpoint Paths

**Verify mobile app is using correct endpoints:**
- Login: `POST https://cashbook-backend-2.onrender.com/api/token/`
- Register: `POST https://cashbook-backend-2.onrender.com/api/register/`
- Auth Status: `GET https://cashbook-backend-2.onrender.com/api/auth/status/`

## Quick Test Steps

### Test 1: Check Backend is Live
```powershell
curl https://cashbook-backend-2.onrender.com/api/auth/status/
```

**Expected:** Should return JSON with authentication status

### Test 2: Check from Mobile App
1. Open mobile app
2. Try to login or register
3. Check network tab/logs for API calls
4. Look for error messages

### Test 3: Check Mobile App Config
1. Find API configuration file in mobile app
2. Verify backend URL is set correctly
3. Check if it's using `http://` instead of `https://`

## Mobile App Configuration Checklist

In your mobile app (`cashbook-mobile`), check:

- [ ] **API Base URL** is set to `https://cashbook-backend-2.onrender.com/api`
- [ ] **Backend URL** is set to `https://cashbook-backend-2.onrender.com`
- [ ] Using **HTTPS** (not HTTP)
- [ ] **Network requests** are enabled in app permissions
- [ ] **Axios/Fetch** is configured correctly
- [ ] **Error handling** shows network errors

## Common Mobile App Files to Check

1. **API Service File:**
   - `src/services/api.js`
   - `src/config/api.js`
   - `src/utils/api.js`

2. **Environment Config:**
   - `.env`
   - `app.json`
   - `config.js`

3. **API Calls:**
   - `src/services/auth.js`
   - `src/contexts/AuthContext.js`

## Fix CORS for Mobile App

Since mobile apps don't have a traditional "origin", you might need to:

**Option 1: Allow All Origins (Development)**
In Render Dashboard → Environment:
```
CORS_ALLOW_ALL_ORIGINS=True
```

**Option 2: Update CORS Settings**
In Render Dashboard → Environment:
```
CORS_ALLOWED_ORIGINS=*
```

**Option 3: Update settings.py** (if you have access)
The code already allows all origins when DEBUG=True, but in production (DEBUG=False), it uses CORS_ALLOWED_ORIGINS.

## Next Steps

1. **Verify backend is live:**
   ```powershell
   curl https://cashbook-backend-2.onrender.com/api/auth/status/
   ```

2. **Check mobile app config:**
   - Find where API URL is configured
   - Verify it points to `https://cashbook-backend-2.onrender.com/api`

3. **Update CORS in Render:**
   - Go to Render Dashboard → Environment
   - Set `CORS_ALLOW_ALL_ORIGINS=True` (for testing)
   - Or update `CORS_ALLOWED_ORIGINS` with proper values

4. **Test from mobile app:**
   - Try login/register
   - Check network logs
   - Look for error messages

## Share Details

To help debug further, please share:
1. **Mobile app API config** - Where is the backend URL set?
2. **Error messages** - Any errors in mobile app console/logs?
3. **Network logs** - What requests are being made (if any)?
4. **Backend status** - Is `https://cashbook-backend-2.onrender.com/api/auth/status/` accessible?

