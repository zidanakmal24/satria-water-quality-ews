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
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Optional SMTP configuration for temporary password reset notification
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", ""))
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}

settings = Settings()
