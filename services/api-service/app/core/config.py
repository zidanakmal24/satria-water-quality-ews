import os
from dotenv import load_dotenv

# Load .env file if it exists (for local running outside docker)
load_dotenv()

class Settings:
    PROJECT_NAME: str = "SATRIA Water Quality EWS - API Gateway"
    
    # Microservice URLs
    ML_SERVICE_URL: str = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
    DATA_SERVICE_URL: str = os.getenv("DATA_SERVICE_URL", "http://localhost:8002")
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173"
        ).split(",")
        if origin.strip()
    ]
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

settings = Settings()
