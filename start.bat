@echo off
echo ================================================
echo     DMS-TRESVANCE - Starting All Services
echo ================================================

echo.
echo [1/2] Starting Backend...
start "DMS Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "DMS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ================================================
echo  Backend  : http://localhost:8000
echo  Frontend : http://localhost:5173
echo ================================================
echo.
echo Both servers are running in separate windows.
pause
