# 🚨 URGENT: Fix Build Command in Render Dashboard

## Problem

The build is failing because Render Dashboard has a **build command override** that includes `cd backend`:

```
cd backend && pip install -r requirements.txt && python manage.py migrate && ...
```

But there's **no `backend` directory** - your files are in the **root**!

---

## ✅ IMMEDIATE FIX

### Step 1: Update Build Command in Render Dashboard

1. Go to: https://dashboard.render.com
2. Click: Your service `cashbook-backend-2`
3. Click: **Settings** tab
4. Scroll to: **"Build & Deploy"** section
5. Find: **"Build Command"** field
6. **REPLACE** the current command with:
   ```
   pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
   ```
7. **REMOVE** any `cd backend &&` from the beginning
8. Click: **"Save Changes"**

### Step 2: Clear Root Directory (If Set)

1. Still in **Settings → Build & Deploy**
2. Find: **"Root Directory"** field
3. **DELETE** any value (make it empty)
4. Click: **"Save Changes"**

### Step 3: Verify Start Command

1. Still in **Settings → Build & Deploy**
2. Find: **"Start Command"** field
3. Should be:
   ```
   gunicorn wsgi:application
   ```
4. If different, update it
5. Click: **"Save Changes"**

### Step 4: Manual Deploy

1. Click: **"Manual Deploy"** button (top right)
2. Select: **"Deploy latest commit"**
3. Watch: Build logs

---

## ✅ Correct Build Command

**Should be:**
```
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

**NOT:**
```
cd backend && pip install -r requirements.txt && ...
```

---

## 📋 Why This Happens

Render Dashboard settings **override** `render.yaml`. Even though `render.yaml` is correct, if the Dashboard has a build command set, it will use that instead.

**Solution:** Update the build command in Render Dashboard to remove `cd backend &&`.

---

## ✅ After Fix

Once fixed, the build should succeed:
```
==> Installing dependencies...
==> Running migrations...
==> Collecting static files...
==> Build succeeded! 🎉
```

