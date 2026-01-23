# Build Failed - Step-by-Step Fix

## Quick Fix Checklist

### ✅ Step 1: Check Render Dashboard Settings

**CRITICAL: Root Directory Setting**

1. Go to https://dashboard.render.com
2. Click your service: `cashbook-backend-2`
3. Click **"Settings"** tab
4. Scroll to **"Build & Deploy"** section
5. Find **"Root Directory"** field:
   - **If it says `backend`** → **CLEAR IT** (make it empty)
   - **If it's empty** → Leave it empty
6. **Click "Save Changes"**

### ✅ Step 2: Verify Build Command

In Settings → Build & Deploy, make sure:

**Build Command:**
```
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

**Start Command:**
```
gunicorn wsgi:application
```

### ✅ Step 3: Verify Python Version

In Settings → Environment Variables, check:
- **PYTHON_VERSION** should be `3.12.10` OR leave it empty (will use `runtime.txt`)

### ✅ Step 4: Check Required Files

Make sure these files exist in your **root directory** (not in a subdirectory):
- ✅ `manage.py`
- ✅ `settings.py`
- ✅ `wsgi.py`
- ✅ `urls.py`
- ✅ `requirements.txt`
- ✅ `runtime.txt`
- ✅ `Procfile`

### ✅ Step 5: Check Build Logs

1. Go to Render Dashboard → Your Service
2. Click **"Logs"** tab
3. Scroll to the **build section** (look for red errors)
4. **Copy the exact error message** and share it

## Common Build Errors & Fixes

### Error 1: "ModuleNotFoundError: No module named 'settings'"
**Cause:** Root Directory is set to `backend`  
**Fix:** Clear Root Directory in Settings

### Error 2: "FileNotFoundError: manage.py"
**Cause:** Root Directory is wrong or files are in wrong location  
**Fix:** Clear Root Directory, verify files are in root

### Error 3: "psycopg2 ImportError"
**Cause:** Python version mismatch  
**Fix:** Set PYTHON_VERSION to `3.12.10` or ensure `runtime.txt` has `python-3.12.10`

### Error 4: "Command 'python manage.py migrate' failed"
**Cause:** Database connection issue or missing migrations  
**Fix:** Check DATABASE_URL environment variable is set correctly

### Error 5: "gunicorn: command not found"
**Cause:** gunicorn not installed  
**Fix:** Verify `requirements.txt` includes `gunicorn==21.2.0`

## Manual Fix Steps

### Option A: Fix in Render Dashboard (Recommended)

1. **Clear Root Directory:**
   - Settings → Build & Deploy → Root Directory → **Clear it**

2. **Set Build Command:**
   - Settings → Build & Deploy → Build Command:
     ```
     pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
     ```

3. **Set Start Command:**
   - Settings → Build & Deploy → Start Command:
     ```
     gunicorn wsgi:application
     ```

4. **Set Python Version:**
   - Settings → Environment → Add Variable:
     - Key: `PYTHON_VERSION`
     - Value: `3.12.10`

5. **Save All Changes**

6. **Manual Deploy:**
   - Click "Manual Deploy" → "Deploy latest commit"

### Option B: Use Procfile (Alternative)

If Render Dashboard settings aren't working, ensure `Procfile` is correct:

```
web: gunicorn wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
```

## Verify Files Are Committed

Make sure all config files are committed:

```bash
git status
git add runtime.txt requirements.txt render.yaml Procfile
git commit -m "Fix: Update deployment configuration"
git push origin main
```

## After Fixing

1. **Wait 2-5 minutes** for build to complete
2. **Check Logs** for "Build succeeded!"
3. **Test endpoint:**
   ```powershell
   curl https://cashbook-backend-2.onrender.com/api/auth/status/
   ```

## Still Failing?

**Share the exact error message** from Render build logs, and I'll help you fix it!

Common things to check:
- Root Directory is empty
- Build Command is correct
- Start Command is correct
- Python version is 3.12.10
- All files are in root directory
- Environment variables are set

