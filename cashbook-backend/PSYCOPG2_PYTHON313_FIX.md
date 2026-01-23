# psycopg2 Python 3.13 Compatibility Fix

## 🔍 Problem Identified

The build is failing because:
1. **Python 3.13.4 is being used** (instead of 3.12.10)
2. **psycopg2-binary 2.9.9 is incompatible** with Python 3.13.4
3. **Root Directory is set to `backend`** in Render Dashboard

Error:
```
ImportError: /opt/render/project/src/.venv/lib/python3.13/site-packages/psycopg2/_psycopg.cpython-313-x86_64-linux-gnu.so: undefined symbol: _PyInterpreterState_Get
```

---

## ✅ Solution: Two Options

### Option 1: Force Python 3.12.10 (RECOMMENDED)

**Step 1: Clear Root Directory**
1. Go to Render Dashboard → Settings
2. Find "Root Directory" field
3. **DELETE** any value (make it empty)
4. Save

**Step 2: Force Python Version**
1. Go to Render Dashboard → Environment
2. Add/Update:
   - **Key:** `PYTHON_VERSION`
   - **Value:** `3.12.10`
3. Save

**Step 3: Manual Deploy**
- Click "Manual Deploy" → "Deploy latest commit"

---

### Option 2: Use Python 3.13 Compatible psycopg2

**Step 1: Update requirements.txt**
```txt
psycopg2-binary>=2.9.10
```

**Step 2: Clear Root Directory**
1. Go to Render Dashboard → Settings
2. Find "Root Directory" field
3. **DELETE** any value (make it empty)
4. Save

**Step 3: Manual Deploy**

---

## 🎯 Root Cause

The error shows:
- Path: `/opt/render/project/src/backend/cashbook_backend/settings.py`
- Build command: `cd backend && pip install -r requirements.txt`

This means **Root Directory is set to `backend`** in Render Dashboard, which is wrong!

Your files are in the **root** of the repository, not in a `backend` subdirectory.

---

## 📋 Complete Fix Checklist

- [ ] **Root Directory is EMPTY** in Render Dashboard Settings
- [ ] **PYTHON_VERSION = 3.12.10** in Environment Variables (Option 1)
- [ ] **OR** `psycopg2-binary>=2.9.10` in requirements.txt (Option 2)
- [ ] **All environment variables** are set correctly
- [ ] **Manual Deploy** triggered

---

## 🔧 Why This Happens

1. **Root Directory** setting overrides `render.yaml`
2. **Python 3.13.4** is Render's default (newer than 3.12.10)
3. **psycopg2-binary 2.9.9** was built for Python 3.12, not 3.13

---

## ✅ After Fix

Once fixed, you should see:
```
==> Using Python version 3.12.10
==> Installing dependencies...
==> Build succeeded! 🎉
```

