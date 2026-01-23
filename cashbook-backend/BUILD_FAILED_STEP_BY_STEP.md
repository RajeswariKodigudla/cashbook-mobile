# Build Failed - Step-by-Step Fix Guide

## ⚠️ CRITICAL: Check Render Dashboard Settings

The build is failing because of **Render Dashboard configuration**, not your code.

### Step 1: Fix Root Directory (MOST IMPORTANT)

1. **Go to:** https://dashboard.render.com
2. **Click:** Your service (`cashbook-backend-2`)
3. **Click:** "Settings" tab
4. **Scroll to:** "Build & Deploy" section
5. **Find:** "Root Directory" field
6. **ACTION:** 
   - **If it says `backend`** → **DELETE IT** (make it completely empty)
   - **If it's empty** → Leave it empty
7. **Click:** "Save Changes" button at the bottom

**This is the #1 cause of build failures!**

---

### Step 2: Verify Build Command

In Settings → Build & Deploy:

**Build Command should be:**
```
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

**Start Command should be:**
```
gunicorn wsgi:application
```

---

### Step 3: Set Python Version

In Settings → Environment Variables:

**Add/Update:**
- **Key:** `PYTHON_VERSION`
- **Value:** `3.12.10`
- **OR** leave it empty (will use `runtime.txt`)

---

### Step 4: Check Required Environment Variables

Make sure these are set in Render Dashboard → Environment:

- ✅ `SECRET_KEY` - Your secret key
- ✅ `DEBUG` - Set to `False`
- ✅ `ALLOWED_HOSTS` - Set to `cashbook-backend-2.onrender.com,*.onrender.com`
- ✅ `DATABASE_URL` - Your PostgreSQL connection string
- ✅ `CORS_ALLOW_ALL_ORIGINS` - Set to `True` (for mobile app)

---

### Step 5: Manual Deploy

After fixing settings:

1. **Click:** "Manual Deploy" button (top right)
2. **Select:** "Deploy latest commit"
3. **Watch:** Build logs for errors
4. **Wait:** 5-10 minutes for build to complete

---

## Common Build Errors

### Error: "ModuleNotFoundError: No module named 'settings'"
**Fix:** Root Directory is set to `backend` → Clear it

### Error: "FileNotFoundError: manage.py"
**Fix:** Root Directory is wrong → Clear it

### Error: "psycopg2 ImportError"
**Fix:** Python version mismatch → Set PYTHON_VERSION to `3.12.10`

### Error: "Command failed: python manage.py migrate"
**Fix:** Database connection issue → Check DATABASE_URL is set

---

## Quick Checklist

Before deploying, verify:

- [ ] **Root Directory is EMPTY** (not `backend`)
- [ ] **Build Command** is correct
- [ ] **Start Command** is `gunicorn wsgi:application`
- [ ] **Python Version** is `3.12.10` (or empty)
- [ ] **All environment variables** are set
- [ ] **Files are committed** to GitHub
- [ ] **runtime.txt** has `python-3.12.10`

---

## After Fixing

1. **Save all changes** in Render Dashboard
2. **Click "Manual Deploy"**
3. **Watch build logs** - should see:
   ```
   ==> Using Python version 3.12.10
   ==> Installing dependencies...
   ==> Build succeeded!
   ```

---

## If Still Failing

**Copy the exact error message** from Render build logs and share it. Look for:
- Red error messages
- "Error:" or "Failed:" lines
- Import errors
- File not found errors

The error message will tell us exactly what's wrong!

