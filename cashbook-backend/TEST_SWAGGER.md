# Testing Swagger - Troubleshooting 404 Error

## ✅ **FIXES APPLIED**

1. **Moved Swagger URLs to top** - Prevents URL pattern conflicts
2. **Added static file serving** - For Swagger UI assets in development
3. **Verified configuration** - All settings are correct

---

## 🚀 **STEPS TO TEST**

### 1. **Set DEBUG=True (if not already set)**

In PowerShell:
```powershell
$env:DEBUG="True"
```

Or create/update `.env` file:
```env
DEBUG=True
```

### 2. **Restart Django Server**

```bash
python manage.py runserver
```

### 3. **Access Swagger**

Open in browser:
- **Swagger UI**: http://localhost:8000/swagger/
- **ReDoc**: http://localhost:8000/redoc/
- **JSON Schema**: http://localhost:8000/swagger.json

---

## 🔍 **IF STILL GETTING 404**

### Check 1: Is server running?
```bash
# Should see: "Starting development server at http://127.0.0.1:8000/"
python manage.py runserver
```

### Check 2: Is DEBUG=True?
```bash
python manage.py shell
>>> from django.conf import settings
>>> print(settings.DEBUG)
# Should print: True
```

### Check 3: Check URL patterns
```bash
python manage.py show_urls  # If you have django-extensions installed
```

### Check 4: Try direct schema URL
```
http://localhost:8000/swagger.json
```
If this works but `/swagger/` doesn't, it's a static files issue.

### Check 5: Collect static files (if needed)
```bash
python manage.py collectstatic --noinput
```

---

## 📝 **COMMON ISSUES**

1. **404 on `/swagger/` but `/swagger.json` works**
   - Static files not being served
   - Solution: Ensure `DEBUG=True` and static files are configured

2. **404 on all Swagger URLs**
   - URL patterns not loaded
   - Solution: Restart server, check for import errors

3. **"Page not found" error**
   - URL pattern conflict
   - Solution: Swagger URLs are now at the top of urlpatterns

---

## ✅ **VERIFICATION**

After fixes, you should be able to:
- ✅ Access http://localhost:8000/swagger/
- ✅ See the Swagger UI interface
- ✅ See all API endpoints listed
- ✅ Test endpoints interactively

---

**If you still get 404, please share:**
1. The exact URL you're accessing
2. The error message from Django (check server console)
3. Whether `/swagger.json` works

