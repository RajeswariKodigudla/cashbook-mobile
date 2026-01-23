@echo off
REM Run Django server in debug mode
echo ========================================
echo Starting Django Server in DEBUG MODE
echo ========================================
echo.

REM Set debug mode
set DEBUG=True

REM Run server
python manage.py runserver

pause

