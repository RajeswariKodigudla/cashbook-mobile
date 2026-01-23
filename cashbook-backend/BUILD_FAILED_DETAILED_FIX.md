# Build Failed - Detailed Fix Guide

## 🔍 Problem: Build Failed with No Details

Render is showing "Build failed 😞" but not the specific error. This usually means:
1. **Root Directory** is set incorrectly in Render Dashboard
2. **Build command** is failing silently
3. **Python version** mismatch
4. **Missing dependencies**

---

## ✅ Step-by-Step Fix

### Step 1: Check Render Dashboard - Root Directory (CRITICAL!)

1. Go to: https://dashboard.render.com
2. Click: Your service `cashbook-backend-2`
3. Click: **Settings** tab
4. Scroll to: **"Build & Deploy"** section
5. Find: **"Root Directory"** field
6. **ACTION:** 
   - **If it says anything** (like `backend`, `cashbook-backend`, etc.) → **DELETE IT**
   - **Make it completely EMPTY**
   - **Leave it blank**
7. Click: **"Save Changes"** button

**⚠️ This is the #1 cause of build failures!**

---

### Step 2: Verify Build Settings

In **Settings → Build & Deploy**, check:

**Build Command:**
```
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

**Start Command:**
```
gunicorn wsgi:application
```

**OR** (if using Procfile):
```
web: gunicorn wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile - --error-logfile -
```

---

### Step 3: Check Environment Variables

Go to **Settings → Environment** and verify these are set:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | `d-h0id2meyly4jz$14002nubp0-++v5yuxop^f6&_hxk)r3()z` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `cashbook-backend-2.onrender.com,*.onrender.com` |
| `DATABASE_URL` | `postgresql://cashbook:Y0FxCK1korZdZIROIxaJxPUMUqJYA1kn@dpg-d5giqe6r433s73dn7ptg-a/cashbook_os9o` |
| `CORS_ALLOW_ALL_ORIGINS` | `True` |
| `PYTHON_VERSION` | `3.12.10` (optional, uses runtime.txt if not set) |

---

### Step 4: Check Build Logs for Specific Errors

1. Go to: **Render Dashboard → Your Service**
2. Click: **"Events"** or **"Logs"** tab
3. Look for: **Red error messages**
4. Common errors:
   - `ModuleNotFoundError: No module named 'settings'` → Root Directory issue
   - `FileNotFoundError: manage.py` → Root Directory issue
   - `ImportError: psycopg2` → Python version issue
   - `Command failed: python manage.py migrate` → Database connection issue

---

### Step 5: Manual Deploy

After fixing settings:

1. Click: **"Manual Deploy"** button (top right)
2. Select: **"Deploy latest commit"**
3. Watch: Build logs in real-time
4. Wait: 5-10 minutes for build to complete

---

## 🔧 Alternative: Use render.yaml

If dashboard settings aren't working, Render should use `render.yaml` automatically.

**Make sure:**
- ✅ `render.yaml` is in the **root** of your repository
- ✅ It's **committed** to GitHub
- ✅ Render is connected to the correct **GitHub repository**

---

## 📋 Pre-Deploy Checklist

Before deploying, verify:

- [ ] **Root Directory is EMPTY** in Render Dashboard
- [ ] **Build Command** matches the one above
- [ ] **Start Command** is `gunicorn wsgi:application`
- [ ] **All environment variables** are set correctly
- [ ] **Files are committed** to GitHub
- [ ] **runtime.txt** has `python-3.12.10`
- [ ] **requirements.txt** exists and has all dependencies
- [ ] **manage.py** is in root directory
- [ ] **wsgi.py** is in root directory

---

## 🐛 Common Build Errors & Fixes

### Error: "ModuleNotFoundError: No module named 'settings'"
**Cause:** Root Directory is set to `backend` or similar  
**Fix:** Clear Root Directory field in Render Dashboard

### Error: "FileNotFoundError: manage.py"
**Cause:** Root Directory is wrong  
**Fix:** Clear Root Directory field

### Error: "ImportError: psycopg2 is required"
**Cause:** Python version incompatible with psycopg2  
**Fix:** Set PYTHON_VERSION to `3.12.10` or ensure `runtime.txt` has `python-3.12.10`

### Error: "Command failed: python manage.py migrate"
**Cause:** Database connection issue  
**Fix:** Check DATABASE_URL is set correctly

### Error: "No such file or directory: requirements.txt"
**Cause:** Root Directory is wrong  
**Fix:** Clear Root Directory field

---

## 📞 Need More Help?

If build still fails after these steps:

1. **Copy the FULL error message** from Render build logs
2. **Screenshot** the Render Dashboard settings
3. **Check** if files are committed to GitHub

The error message will tell us exactly what's wrong!

---

## ✅ After Successful Build

Once build succeeds, you should see:
```
==> Build succeeded! 🎉
==> Starting service...
```

Then test your API:
```
https://cashbook-backend-2.onrender.com/api/auth/status/
```

