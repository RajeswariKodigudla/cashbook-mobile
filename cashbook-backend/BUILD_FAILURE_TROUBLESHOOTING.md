# Build Failure Troubleshooting Guide

## Most Common Issue: Root Directory Setting

The error shows Render is trying to run `cd backend && ...`, which means **Render Dashboard has a "Root Directory" setting** that overrides your `render.yaml` file.

### Fix This First:

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click your service**: `cashbook-backend-2` (or whatever your service name is)
3. **Click "Settings" tab** (left sidebar)
4. **Scroll to "Build & Deploy" section**
5. **Find "Root Directory" field**
6. **If it says `backend` or anything other than empty/`.`:**
   - **Clear it completely** (leave it empty)
   - OR set it to `.` (dot)
7. **Click "Save Changes"** at the bottom

### Why This Matters:
- Render Dashboard settings **override** `render.yaml`
- If Root Directory is set to `backend`, Render looks for files in a `backend/` folder
- Your project files are in the **root** directory, not in a subdirectory
- This causes `manage.py`, `settings.py`, etc. to not be found

---

## Other Things to Check

### 1. Verify Files Are Committed and Pushed

```bash
# Check if your changes are committed
git status

# If not, commit them:
git add runtime.txt requirements.txt render.yaml
git commit -m "Fix: Update Python version and Render config"
git push origin main
```

### 2. Check Render Service Configuration

In Render Dashboard → Settings, verify:

- **Environment**: Python
- **Build Command**: Should be `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
- **Start Command**: Should be `gunicorn wsgi:application`
- **Python Version**: Should be `3.12.10` (or leave empty to use `runtime.txt`)

### 3. Verify File Structure

Your project should have these files in the **root** directory (not in a subdirectory):
```
cashbook-backend/
├── manage.py          ← Must be in root
├── settings.py         ← Must be in root
├── wsgi.py            ← Must be in root
├── urls.py            ← Must be in root
├── requirements.txt   ← Must be in root
├── runtime.txt        ← Must be in root
├── Procfile           ← Must be in root
└── transactions/      ← App directory
```

### 4. Check Build Logs

In Render Dashboard:
1. Go to your service
2. Click "Logs" tab
3. Look for the specific error message
4. Common errors:
   - `ModuleNotFoundError: No module named 'settings'` → Root Directory issue
   - `FileNotFoundError: manage.py` → Root Directory issue
   - `psycopg2` errors → Python version issue (should be fixed now)

---

## Step-by-Step Fix Process

### Step 1: Clear Root Directory
1. Render Dashboard → Your Service → Settings
2. Find "Root Directory"
3. **Clear it** (make it empty)
4. Save

### Step 2: Verify Build Command
In Settings → Build & Deploy:
- Build Command: `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
- Start Command: `gunicorn wsgi:application`

### Step 3: Verify Python Version
- Option A: Set `PYTHON_VERSION` environment variable to `3.12.10`
- Option B: Make sure `runtime.txt` contains `python-3.12.10` and is committed

### Step 4: Redeploy
1. Click "Manual Deploy" button
2. Select "Deploy latest commit"
3. Watch the logs

---

## Expected Successful Build Output

You should see:
```
==> Using Python version 3.12.10
==> Installing dependencies...
==> Running migrations...
==> Collecting static files...
==> Build succeeded!
==> Starting service...
```

---

## If Still Failing

Share the **exact error message** from Render logs, and I can help debug further.

Common issues:
- ✅ Root Directory set to `backend` → Clear it
- ✅ Python version mismatch → Check `runtime.txt` and environment variable
- ✅ Missing files → Verify all files are in root directory
- ✅ Wrong build command → Check Settings → Build Command

