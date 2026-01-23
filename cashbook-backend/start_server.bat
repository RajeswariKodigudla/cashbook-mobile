@echo off
cd /d "%~dp0"
echo ========================================
echo Cashbook Backend - Starting Server
echo ========================================
echo.

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Apply migrations for accounts and notifications (if needed)
echo Applying migrations for accounts and notifications...
python apply_migrations.py

REM Run standard migrations
echo Running standard migrations...
python manage.py migrate

REM Start the server
echo.
echo Starting Django development server...
echo Server will be available at: http://127.0.0.1:8000
echo API Documentation: http://127.0.0.1:8000/swagger/
echo.
python manage.py runserver

if errorlevel 1 (
    echo.
    echo ERROR: Server startup failed!
    echo.
    pause
)
