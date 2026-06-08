#!/bin/bash

# SATRIA Water Quality Classifier - Launcher for macOS/Linux

function cleanup_ports() {
    for port in 5000 8000 8001 8002 5173; do
        pid=$(lsof -t -i:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            kill -9 $pid >/dev/null 2>&1
            echo "  [CLEANUP] Killed orphan process PID $pid on port $port"
        fi
    done
}

echo "==================================================="
echo "  SATRIA Water Quality Classifier - Launcher"
echo "==================================================="
echo ""
echo "Please choose how you want to run the application:"
echo "[1] Run with Docker (Recommended)"
echo "[2] Run Locally without Docker (macOS/Linux)"
echo ""
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "[1/4] Checking Docker status..."
    if ! docker info >/dev/null 2>&1; then
        echo "[ERROR] Docker is not running! Please start Docker Desktop first."
        exit 1
    fi
    echo "Docker is running."
    echo ""

    echo "[2/4] Starting backend microservices via docker-compose..."
    if ! docker-compose up -d; then
        echo "[ERROR] Failed to start backend services."
        exit 1
    fi
    echo "Backend services are running in the background."
    echo ""

    echo "[3/4] Preparing frontend..."
    if [ ! -d "frontend/node_modules/" ]; then
        echo "Node modules not found. Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi

    echo "Starting frontend development server in the background..."
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo ""

    echo "[4/4] Opening application in your default browser..."
    sleep 3
    open http://127.0.0.1:5173 2>/dev/null || xdg-open http://127.0.0.1:5173 2>/dev/null
    echo ""

    echo "==================================================="
    echo "  System is UP and RUNNING (with Docker)!"
    echo "  - Backend Gateway: http://127.0.0.1:8000"
    echo "  - MLflow Dashboard: http://127.0.0.1:5000"
    echo "  - Frontend: http://127.0.0.1:5173"
    echo ""
    echo "  To stop all backend services later, run:"
    echo "  docker-compose down"
    echo "  Press Ctrl+C to stop the frontend server and exit."
    echo "==================================================="
    
    # Wait for frontend process to keep the script running, so Ctrl+C can kill it
    wait $FRONTEND_PID
    exit 0

elif [ "$choice" == "2" ]; then
    echo ""
    echo "==================================================="
    echo "  Running Locally Without Docker (Single Window)"
    echo "==================================================="

    echo "[1/6] Setting up Python Virtual Environment..."
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi

    echo "[2/6] Installing Python Dependencies (this may take a minute)..."
    source venv/bin/activate
    pip install -r services/api-service/requirements.txt -q
    pip install -r services/ml-service/requirements.txt -q
    pip install -r services/data-service/requirements.txt -q
    pip install mlflow uvicorn -q
    echo "Dependencies installed."

    echo "[3/6] Copying .env to microservices and frontend..."
    if [ -f ".env" ]; then
        cp -f .env services/api-service/.env 2>/dev/null
        cp -f .env services/ml-service/.env 2>/dev/null
        cp -f .env services/data-service/.env 2>/dev/null
        cp -f .env frontend/.env 2>/dev/null
    else
        echo "[WARNING] .env file not found in root directory!"
    fi

    echo "[4/6] Preparing Frontend..."
    if [ ! -d "frontend/node_modules/" ]; then
        echo "Node modules not found. Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi

    echo "[5/6] Cleaning up leftover processes from previous runs..."
    cleanup_ports

    echo "[6/6] Starting All Services in ONE Window..."
    echo ""
    echo "Upgrading MLflow Database Schema (if needed)..."
    python3 -m mlflow db upgrade sqlite:///mlflow.db >/dev/null 2>&1

    echo "==================================================="
    echo "  System will open in your browser automatically!"
    echo "  PRESS Ctrl+C AT ANY TIME TO STOP EVERYTHING."
    echo "==================================================="
    echo ""
    echo "  - Frontend:        http://127.0.0.1:5173"
    echo "  - API Gateway:     http://127.0.0.1:8000"
    echo "  - ML Service:      http://127.0.0.1:8001"
    echo "  - Data Service:    http://127.0.0.1:8002"
    echo "  - MLflow Dashboard: http://127.0.0.1:5000"
    echo "==================================================="
    
    # Run open browser in background
    (sleep 3 && (open http://127.0.0.1:5173 2>/dev/null || xdg-open http://127.0.0.1:5173 2>/dev/null)) &

    # Using npx concurrently to run all services in one window and kill all on Ctrl+C
    npx concurrently -k -p "[{name}]" -n "MLflow,ML-SVC,DATA-SVC,API-GW,REACT" -c "blue,magenta,cyan,green,yellow" \
        "venv/bin/python -m mlflow server --host 127.0.0.1 --port 5000 --workers 1" \
        "cd services/ml-service && ../../venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001" \
        "cd services/data-service && ../../venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8002" \
        "cd services/api-service && ../../venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" \
        "cd frontend && npm run dev"

    echo ""
    echo "==================================================="
    echo "  Shutting down... Cleaning up all processes..."
    echo "==================================================="
    cleanup_ports
    echo ""
    echo "All services have been successfully stopped!"
    exit 0

else
    echo "Invalid choice. Exiting..."
    exit 1
fi
