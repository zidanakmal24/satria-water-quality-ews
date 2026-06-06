from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Dict
from app.schemas.logs import PredictionLog, PredictionLogCreate
from app.db import queries

router = APIRouter(prefix="/internal/logs", tags=["Prediction Logs"])

@router.post("", response_model=PredictionLog, status_code=status.HTTP_201_CREATED)
def create_prediction_log(log_input: PredictionLogCreate):
    """
    Log a new prediction result.
    """
    try:
        log_data = log_input.model_dump()
        result = queries.save_prediction_log(log_data)
        return result
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{user_id}", response_model=List[PredictionLog])
def get_prediction_logs(
    user_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return")
):
    """
    Fetch prediction logs history for a user.
    """
    try:
        logs = queries.get_prediction_logs(user_id, limit)
        return logs
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/risk-count/{user_id}", response_model=Dict[str, int])
def get_user_risk_count(user_id: str):
    """
    Get the total count of reduced suitability warnings for a user.
    """
    try:
        count = queries.get_user_risk_count(user_id)
        return {"risk_count": count}
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
