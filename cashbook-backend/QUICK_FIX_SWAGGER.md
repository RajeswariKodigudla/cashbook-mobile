# Quick Fix for Swagger 404 Error

## 🔧 **IMMEDIATE STEPS**

### Step 1: Set DEBUG=True

**In PowerShell (before starting server):**
```powershell
$env:DEBUG="True"
```

**OR create a `.env` file in `cashbook-backend/` folder:**
```env
DEBUG=True
```

### Step 2: Restart Server

**Stop the current server (Ctrl+C) and restart:**
```bash
python manage.py runserver
```

### Step 3: Test These URLs

Try these in order:

1. **JSON Schema (should work first):**
   ```
   http://localhost:8000/swagger.json
   ```
   If this returns JSON, Swagger is working!

2. **Swagger UI:**
   ```
   http://localhost:8000/swagger/
   ```

3. **ReDoc:**
   ```
   http://localhost:8000/redoc/
   ```

---

## 🔍 **DIAGNOSTIC COMMANDS**

### Check if DEBUG is True:
```bash
python manage.py shell
>>> from django.conf import settings
>>> print(settings.DEBUG)
```

### Check URL patterns:
```bash
python manage.py shell
>>> from django.urls import get_resolver
>>> resolver = get_resolver()
>>> [print(p.pattern) for p in resolver.url_patterns[:5]]
```

### Test with Python script:
```bash
python test_swagger_urls.py
```

---

## ⚠️ **COMMON CAUSES**

1. **DEBUG=False** - Most common issue!
   - Fix: Set `DEBUG=True` in environment or `.env` file

2. **Server not restarted** - After code changes
   - Fix: Stop and restart `python manage.py runserver`

3. **Static files not served** - In development
   - Fix: DEBUG=True automatically serves static files

4. **Port conflict** - Another server on port 8000
   - Fix: Use different port `python manage.py runserver 8001`

---

## ✅ **VERIFICATION**

If `/swagger.json` works but `/swagger/` doesn't:
- It's a static files issue
- Ensure DEBUG=True
- Restart server

If nothing works:
- Check server console for errors
- Verify drf-yasg is installed: `pip list | findstr drf-yasg`
- Check URL patterns are loaded (see diagnostic commands above)

---

**After following these steps, Swagger should work!**

