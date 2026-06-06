@echo off
title SATRIA Water Quality Classifier - Launcher
cls

echo ===================================================
echo   SATRIA Water Quality Classifier - Launcher
echo ===================================================
echo.
echo Please choose how you want to run the application:
echo [1] Run with Docker (Recommended)
echo [2] Run Locally without Docker (Native Windows)
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" goto rundocker
if "%choice%"=="2" goto runlocal

echo Invalid choice. Exiting...
pause
exit /b 1

:rundocker
echo.
echo [1/4] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)
echo Docker is running.
echo.

echo [2/4] Starting backend microservices via docker-compose...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start backend services.
    pause
    exit /b 1
)
echo Backend services are running in the background.
echo.

echo [3/4] Preparing frontend...
if not exist "frontend\node_modules\" (
    echo Node modules not found. Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo Starting frontend development server in a new window...
start "SATRIA Frontend Dev Server" cmd /k "cd frontend && npm run dev"
echo.

echo [4/4] Opening application in your default browser...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:5173
echo.

echo ===================================================
echo   System is UP and RUNNING (with Docker)!
echo   - Backend Gateway: http://127.0.0.1:8000
echo   - MLflow Dashboard: http://127.0.0.1:5000
echo   - Frontend: http://127.0.0.1:5173
echo.
echo   To stop all backend services later, run:
echo   docker-compose down
echo ===================================================
pause
exit /b 0


:runlocal
echo.
echo ===================================================
echo   Running Locally Without Docker (Single Window)
echo ===================================================

echo [1/5] Setting up Python Virtual Environment...
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

echo [2/5] Installing Python Dependencies (this may take a minute)...
call venv\Scripts\activate.bat
pip install -r services/api-service/requirements.txt -q
pip install -r services/ml-service/requirements.txt -q
pip install -r services/data-service/requirements.txt -q
pip install mlflow uvicorn -q
echo Dependencies installed.

echo [3/5] Copying .env to microservices and frontend...
if exist ".env" (
    copy /Y .env services\api-service\.env >nul
    copy /Y .env services\ml-service\.env >nul
    copy /Y .env services\data-service\.env >nul
    copy /Y .env frontend\.env >nul
) else (
    echo [WARNING] .env file not found in root directory!
)

echo [4/5] Preparing Frontend...
if not exist "frontend\node_modules\" (
    echo Node modules not found. Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo [5/5] Starting All Services in ONE Window...
echo.
echo Upgrading MLflow Database Schema (if needed)...
venv\Scripts\python.exe -m mlflow db upgrade sqlite:///mlflow.db >nul 2>&1

echo ===================================================
echo   System will open in your browser automatically!
echo   PRESS Ctrl+C AT ANY TIME TO STOP EVERYTHING.
echo ===================================================
timeout /t 3 /nobreak >nul

start http://127.0.0.1:5173

:: Using npx concurrently to run all services in one window and kill all on Ctrl+C
npx concurrently -k -p "[{name}]" -n "MLflow,ML-SVC,DATA-SVC,API-GW,REACT" -c "blue,magenta,cyan,green,yellow" ^
"venv\Scripts\python.exe -m mlflow server --host 127.0.0.1 --port 5000 --workers 1" ^
"cd services\ml-service && ..\..\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001" ^
"cd services\data-service && ..\..\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002" ^
"cd services\api-service && ..\..\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000" ^
"cd frontend && npm run dev"

echo.
echo All services have been successfully stopped!
pause
exit /b 0
