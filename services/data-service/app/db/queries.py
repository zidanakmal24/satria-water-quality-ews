import logging
from typing import Optional, List, Dict, Any
from postgrest.exceptions import APIError
from app.db.supabase_client import supabase, SUPABASE_TABLE, SUPABASE_PREDICTION_TABLE

logger = logging.getLogger("data-service")

class DatabaseError(Exception):
    """Custom exception for database errors."""
    pass

def get_profile(
    user_id: str, 
    email: Optional[str] = None, 
    full_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch a user's profile from the database. 
    If it doesn't exist, create a new one using the fallback metadata.
    """
    try:
        # Fetch existing profile
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]

        # Profile not found, insert fallback profile
        fallback = {
            "id": user_id,
            "email": email,
            "full_name": full_name or "SATRIA User",
            "role": "",
            "organization": "",
            "bio": "",
            "avatar_url": None,
        }
        logger.info(f"Profile for {user_id} not found. Creating fallback profile.")
        insert_response = supabase.table("profiles").upsert(fallback).execute()
        if insert_response.data and len(insert_response.data) > 0:
            return insert_response.data[0]
        return fallback

    except APIError as e:
        logger.error(f"Supabase APIError in get_profile: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in get_profile: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")


def update_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an existing profile. If it doesn't exist, insert it.
    """
    try:
        response = supabase.table("profiles").update(updates).eq("id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        
        # If no profile was updated (e.g. didn't exist yet), insert it
        logger.info(f"No profile found to update for {user_id}. Inserting instead.")
        updates["id"] = user_id
        insert_response = supabase.table("profiles").insert(updates).execute()
        if insert_response.data and len(insert_response.data) > 0:
            return insert_response.data[0]
        raise DatabaseError("Failed to update or insert profile.")

    except APIError as e:
        logger.error(f"Supabase APIError in update_profile: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in update_profile: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")


def save_prediction_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save a prediction result log.
    """
    try:
        response = supabase.table(SUPABASE_PREDICTION_TABLE).insert(log_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise DatabaseError("Failed to save prediction log.")
        
    except APIError as e:
        logger.error(f"Supabase APIError in save_prediction_log: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in save_prediction_log: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")


def get_prediction_logs(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Retrieve prediction logs for a user.
    """
    try:
        response = (
            supabase.table(SUPABASE_PREDICTION_TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    except APIError as e:
        logger.error(f"Supabase APIError in get_prediction_logs: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in get_prediction_logs: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")


def get_user_risk_count(user_id: str) -> int:
    """
    Count the number of prediction logs where suitability tier indicates reduced suitability.
    """
    try:
        # Using exact count on the query
        response = (
            supabase.table(SUPABASE_PREDICTION_TABLE)
            .select("id", count="exact")
            .eq("user_id", user_id)
            .ilike("predicted_suitability_tier", "%Reduced%")
            .execute()
        )
        # response.count holds the exact count when count is specified
        return response.count if response.count is not None else 0

    except APIError as e:
        logger.error(f"Supabase APIError in get_user_risk_count: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in get_user_risk_count: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")


def get_eda_rows(limit: int = 1000) -> List[Dict[str, Any]]:
    """
    Retrieve rows from the water_quality_clean table for EDA display.
    """
    try:
        response = supabase.table(SUPABASE_TABLE).select("*").limit(limit).execute()
        return response.data or []

    except APIError as e:
        logger.error(f"Supabase APIError in get_eda_rows: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in get_eda_rows: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")


def get_eda_row_count() -> int:
    """
    Retrieve the total number of rows in the water_quality_clean table.
    """
    try:
        response = supabase.table(SUPABASE_TABLE).select("id", count="exact").execute()
        return response.count if response.count is not None else 0

    except APIError as e:
        logger.error(f"Supabase APIError in get_eda_row_count: {e.message}")
        raise DatabaseError(f"Database error: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected error in get_eda_row_count: {str(e)}")
        raise DatabaseError(f"Unexpected error: {str(e)}")
