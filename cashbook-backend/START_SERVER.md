# How to Start Django Server

## Problem
`python` command not found in PowerShell

## Solutions

### Option 1: Use Full Path to Python (Recommended)
Based on your system, Python is likely installed at:
```
C:\Users\rajes\AppData\Local\Programs\Python\Python313\python.exe
```

**Start server with:**
```powershell
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-backend"
"C:\Users\rajes\AppData\Local\Programs\Python\Python313\python.exe" manage.py runserver
```

### Option 2: Use Batch File
I've created `start_server.bat` that will automatically find Python:
```powershell
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-backend"
.\start_server.bat
```

### Option 3: Add Python to PATH
1. Open **System Properties** → **Environment Variables**
2. Under **System Variables**, find **Path** and click **Edit**
3. Add Python installation path:
   ```
   C:\Users\rajes\AppData\Local\Programs\Python\Python313
   C:\Users\rajes\AppData\Local\Programs\Python\Python313\Scripts
   ```
4. Click **OK** on all dialogs
5. Restart PowerShell
6. Run: `python manage.py runserver`

### Option 4: Use Python Launcher
Try using `py` launcher:
```powershell
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-backend"
py manage.py runserver
```

## Quick Start (Copy & Paste)

```powershell
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-backend"
"C:\Users\rajes\AppData\Local\Programs\Python\Python313\python.exe" manage.py runserver
```

## Verify Server Started

After running the command, you should see:
```
Django version X.X, using settings 'settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

Then test Swagger at: `http://localhost:8000/swagger/`

