from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.schemas.profile import Profile, ProfileUpdate
from app.db import queries

router = APIRouter(prefix="/internal/profiles", tags=["Profiles"])

@router.get("/{user_id}", response_model=Profile)
def get_profile(
    user_id: str,
    email: Optional[str] = Query(None, description="Fallback email if profile is created"),
    full_name: Optional[str] = Query(None, description="Fallback full name if profile is created")
):
    """
    Get a profile by user_id. If not found, a new profile is created with fallback metadata.
    """
    try:
        profile_data = queries.get_profile(user_id, email, full_name)
        return profile_data
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{user_id}", response_model=Profile)
def update_profile(user_id: str, updates: ProfileUpdate):
    """
    Update profile details.
    """
    try:
        # Filter out unset fields to avoid overwriting with defaults
        update_data = updates.model_dump(exclude_unset=True)
        profile_data = queries.update_profile(user_id, update_data)
        return profile_data
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
