# 🚨 URGENT: Fix Start Command in Render Dashboard

## Problem

The deployment is failing with:
```
ModuleNotFoundError: No module named 'cashbook_backend'
==> Running 'gunicorn cashbook_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120'
```

**The Start Command is wrong!** It's trying to use `cashbook_backend.wsgi:application` but your WSGI file is `wsgi.py` in the root directory.

---

## ✅ IMMEDIATE FIX

### Step 1: Update Start Command in Render Dashboard

1. Go to: https://dashboard.render.com
2. Click: Your service `cashbook-backend-2`
3. Click: **Settings** tab
4. Scroll to: **"Build & Deploy"** section
5. Find: **"Start Command"** field
6. **REPLACE** the current command with:
   ```
   gunicorn wsgi:application
   ```
7. **REMOVE** any `--bind`, `--workers`, or other flags (Render handles this automatically)
8. Click: **"Save Changes"**

---

## ✅ Correct Start Command

**Should be:**
```
gunicorn wsgi:application
```

**NOT:**
```
gunicorn cashbook_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
```

---

## Why This Happens

Your project structure has `wsgi.py` in the **root directory**, not in a `cashbook_backend` subdirectory. The start command needs to match your actual file structure.

---

## After Fix

1. **Save changes** in Render Dashboard
2. **Wait** for automatic redeploy (or trigger manual deploy)
3. **Check logs** - should see:
   ```
   ==> Starting service...
   ==> Service is live!
   ```

---

## Quick Checklist

- [ ] **Start Command** is `gunicorn wsgi:application`
- [ ] **No `cashbook_backend.` prefix**
- [ ] **No extra flags** (Render handles PORT, workers, etc.)
- [ ] **Changes saved** in Render Dashboard
- [ ] **Service redeployed** and live

---

## Alternative: Use Procfile

If you want to use the Procfile with custom settings, the Start Command should be empty in Render Dashboard, and Render will automatically use the Procfile.

But the simplest fix is to just set Start Command to:
```
gunicorn wsgi:application
```

