import logging
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.routes import profile, logs, eda

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("data-service")

app = FastAPI(
    title="SATRIA Water Quality EWS - Data Service",
    description="Database Access Layer for managing profiles, predictions logs, and EDA data in Supabase.",
    version="1.0.0"
)

# CORS middleware (primarily for local debugging/testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(profile.router)
app.include_router(logs.router)
app.include_router(eda.router)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "data-service"
    }
