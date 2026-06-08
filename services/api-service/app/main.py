import logging
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, profile, logs, eda
from app.core.config import settings
from app.services.ml_client import ml_client
from app.utils.logger import setup_logger

# Setup logging
logger = setup_logger("api-service")

app = FastAPI(
    title="SATRIA Water Quality EWS - API Gateway",
    description="Gateway & Orchestrator microservice acting as a single entry point for SATRIA Frontend.",
    version="1.0.0"
)

# Enable CORS for frontend web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(predict.router)
app.include_router(profile.router)
app.include_router(logs.router)
app.include_router(eda.router)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """
    Gateway health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "api-service"
    }

@app.get("/model-info", tags=["ML Metadata"])
async def model_info():
    """
    Fetch model metadata directly from the ML Service.
    """
    return await ml_client.get_model_info()
