@echo off
title SATRIA Water Quality Classifier - Launcher
cls

echo ===================================================
echo   SATRIA Water Quality Classifier - Launcher
echo ===================================================
echo.

:: 1. Check if Docker is running
echo [1/4] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)
echo Docker is running.
echo.

:: 2. Start Backend Microservices
echo [2/4] Starting backend microservices via docker-compose...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start backend services.
    pause
    exit /b 1
)
echo Backend services are running in the background.
echo.

:: 3. Prepare and Start Frontend
echo [3/4] Preparing frontend...
if not exist "frontend\node_modules\" (
    echo Node modules not found. Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo Starting frontend development server in a new window...
start "SATRIA Frontend Dev Server" cmd /k "cd frontend && npm run dev"
echo.

:: 4. Open Application in Browser
echo [4/4] Opening application in your default browser...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:5173
echo.

echo ===================================================
echo   System is UP and RUNNING!
echo   - Backend Gateway: http://127.0.0.1:8000
echo   - MLflow Dashboard: http://127.0.0.1:5000
echo   - Frontend: http://127.0.0.1:5173
echo.
echo   To stop all backend services later, run:
echo   docker-compose down
echo ===================================================
pause
