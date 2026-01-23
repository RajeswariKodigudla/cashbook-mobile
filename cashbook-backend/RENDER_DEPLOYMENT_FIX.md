# Render Deployment Fix

## Issues Found

1. **Python Version Mismatch**: Render is using Python 3.13.4, but `psycopg2-binary==2.9.9` doesn't support it
2. **Wrong Start Command**: `render.yaml` references `cashbook_api.wsgi` but should be `wsgi`
3. **Root Directory**: Render might be configured to use `backend/` subdirectory

## Fixes Applied

### 1. Updated `runtime.txt`
- Changed from `python-3.11.0` to `python-3.12.10` (stable, compatible with psycopg2)

### 2. Updated `requirements.txt`
- Changed `psycopg2-binary==2.9.9` to `psycopg2-binary>=2.9.9` (allows newer compatible versions)

### 3. Updated `render.yaml`
- Fixed `startCommand` from `gunicorn cashbook_api.wsgi:application` to `gunicorn wsgi:application`
- Updated Python version to `3.12.10`
- Added `collectstatic` to build command

## Additional Steps Required in Render Dashboard

### Check Root Directory Setting

1. Go to Render Dashboard → Your Service (`cashbook-backend-2`)
2. Click **"Settings"** tab
3. Scroll to **"Build & Deploy"** section
4. Check **"Root Directory"** field:
   - If it says `backend`, **change it to `.` (empty/root)**
   - Or remove the value entirely
5. Save changes

### Verify Environment Variables

Make sure these are set in Render Dashboard → Environment:
- `SECRET_KEY` - Your secret key
- `DEBUG=False`
- `ALLOWED_HOSTS=your-app-name.onrender.com,*.onrender.com`
- `DATABASE_URL` - Your PostgreSQL connection string
- `CORS_ALLOWED_ORIGINS` - Your frontend URLs

## Deploy Again

After making these changes:

1. **Commit the fixes:**
   ```bash
   git add runtime.txt requirements.txt render.yaml
   git commit -m "Fix: Update Python version and psycopg2 for Render deployment"
   git push origin main
   ```

2. **Or manually deploy:**
   - Go to Render Dashboard
   - Click "Manual Deploy" → "Deploy latest commit"

## Expected Build Output

You should see:
```
✅ Installing Python version 3.12.10...
✅ Installing dependencies...
✅ Running migrations...
✅ Collecting static files...
✅ Starting gunicorn...
```

## If Still Failing

1. Check Render logs for specific error
2. Verify `runtime.txt` is in the root directory
3. Ensure `requirements.txt` has all dependencies
4. Check that `wsgi.py` exists in root directory
5. Verify `manage.py` exists in root directory

