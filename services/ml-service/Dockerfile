FROM python:3.11-slim

WORKDIR /app

# Install build dependencies if needed (for libraries like lightgbm/numpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and baked artifacts
COPY app/ app/

EXPOSE 8001

# Command to run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
