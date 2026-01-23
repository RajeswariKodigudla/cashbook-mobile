# Quick Build Fix - Do These Steps NOW

## ⚠️ Most Common Issue: Root Directory

**90% of build failures are caused by this!**

### Fix Root Directory (DO THIS FIRST):

1. **Go to:** https://dashboard.render.com
2. **Click:** Your service (`cashbook-backend-2`)
3. **Click:** "Settings" tab
4. **Scroll to:** "Build & Deploy" section
5. **Find:** "Root Directory" field
6. **Action:** 
   - If it says `backend` → **DELETE IT** (make it empty)
   - If it's empty → Leave it empty
7. **Click:** "Save Changes" button

---

## ✅ Verify These Settings

### Build Command:
```
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

### Start Command:
```
gunicorn wsgi:application
```

### Environment Variables:
- `PYTHON_VERSION` = `3.12.10` (or leave empty to use runtime.txt)

---

## 🔄 After Fixing Settings

1. **Click "Manual Deploy"** button (top right)
2. **Select "Deploy latest commit"**
3. **Watch the logs** - should see:
   ```
   ==> Using Python version 3.12.10
   ==> Installing dependencies...
   ==> Build succeeded!
   ```

---

## 📋 If Still Failing

**Copy the exact error message** from Render logs and share it. Look for:
- Red error messages
- Lines starting with "Error:" or "Failed:"
- Import errors
- File not found errors

---

## ✅ Quick Checklist

- [ ] Root Directory is **EMPTY** (not `backend`)
- [ ] Build Command is correct
- [ ] Start Command is `gunicorn wsgi:application`
- [ ] Python version is `3.12.10` (or empty)
- [ ] All files are committed and pushed to GitHub
- [ ] `runtime.txt` exists and has `python-3.12.10`
- [ ] `requirements.txt` exists in root
- [ ] `Procfile` exists in root

---

**After fixing Root Directory, try deploying again!**

