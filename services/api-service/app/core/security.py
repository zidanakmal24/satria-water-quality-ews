import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("api-service.security")
security = HTTPBearer()

# Initialize global Supabase client for auth operations
if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
    logger.error("SUPABASE_URL or SUPABASE_ANON_KEY is not configured.")
    supabase_client = None
else:
    supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to validate Supabase JWT tokens via Supabase Auth API.
    This natively supports ECC keys without requiring manual JWKS caching or HS256 secrets.
    Returns the user data if valid.
    """
    token = credentials.credentials
    
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server security configuration error. Please contact administrator."
        )

    try:
        # Call Supabase to verify the token and get the user
        user_resp = supabase_client.auth.get_user(token)
        user = user_resp.user
        
        if not user:
            raise Exception("User not found in response")
            
        # Return a dictionary mimicking the decoded JWT payload used elsewhere
        return {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "raw_user_meta_data": user.user_metadata or {}
        }
        
    except Exception as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
