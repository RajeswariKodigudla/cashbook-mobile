# Running Backend in Debug Mode

## Quick Start

### Option 1: Using PowerShell (Recommended)
```powershell
cd cashbook-backend
$env:DEBUG='True'
python manage.py runserver
```

### Option 2: Using Batch File
```cmd
cd cashbook-backend
run_server_debug.bat
```

### Option 3: Using Python Script
```bash
cd cashbook-backend
python run_debug.py
```

---

## What Debug Mode Shows

When you start the server, you should see:

```
[DATABASE] Connecting to PostgreSQL: cashbook@dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com:5432/cashbook_os9o
```

**This confirms which database the server is using!**

---

## Expected Output

```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

---

## Check Database Connection

When you:
1. **Register a user** - Check logs for:
   ```
   Registration attempt for username: 'test' | Database: cashbook_os9o | Engine: django.db.backends.postgresql
   ```

2. **Login** - Check logs for:
   ```
   Login attempt for username: 'hello' | Database: cashbook_os9o | Engine: django.db.backends.postgresql
   ```

---

## Important Notes

- **Debug Mode**: Shows detailed error messages
- **Database Logging**: All database operations are logged
- **Auto-reload**: Server restarts on code changes
- **Port**: Server runs on `http://localhost:8000/`

---

## Troubleshooting

If you see a different database name in logs:
1. Check environment variables: `$env:DATABASE_URL`
2. Check for `.env` file in `cashbook-backend/`
3. Restart server to clear cached connections

---

**Status:** ✅ Ready to run in debug mode!

