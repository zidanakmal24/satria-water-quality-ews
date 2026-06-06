import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


from app.core.config import settings
from app.schemas.prediction_schema import PredictionRequest, BatchPredictionRequest, PredictionResponse
from app.services.ml_client import ml_client
from app.services.data_client import data_client
from app.utils.mapping import map_frontend_to_ml

logger = logging.getLogger("api-service.predict")
router = APIRouter(tags=["Prediction"])

security_optional = HTTPBearer(auto_error=False)

from app.core.security import supabase_client

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)) -> Optional[dict]:
    """
    Optional authentication dependency.
    If a valid JWT token is provided, returns the decoded user payload from Supabase.
    Otherwise, returns None.
    """
    if not credentials or not supabase_client:
        return None
    try:
        user_resp = supabase_client.auth.get_user(credentials.credentials)
        user = user_resp.user
        if user:
            return {"sub": user.id, "email": user.email, "role": user.role}
        return None
    except Exception as e:
        logger.warning(f"Optional JWT validation failed: {str(e)}")
        return None

@router.post("/predict", response_model=PredictionResponse)
async def predict_single(
    payload: PredictionRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Perform a single water quality prediction using ML Service,
    and automatically log it to Data Service if the user is authenticated.
    """
    # 1. Map frontend keys to ML Service expected format
    ml_payload = map_frontend_to_ml(payload.data)
    
    # 2. Call ML Service
    ml_result = await ml_client.predict(ml_payload)
    
    # 3. Format result for Frontend
    response_data = PredictionResponse(
        predicted_class_id=ml_result["label"],
        predicted_suitability_tier=ml_result["tier"],
        probabilities=ml_result["probabilities"]
    )
    
    # 4. Save to Database if user is logged in
    if user:
        user_id = user.get("sub")
        log_payload = {
            "user_id": user_id,
            "input_data": payload.data,
            "predicted_class_id": response_data.predicted_class_id,
            "predicted_suitability_tier": response_data.predicted_suitability_tier,
            "probabilities": response_data.probabilities
        }
        try:
            # Run save asynchronously in background, or await it
            await data_client.save_prediction_log(log_payload)
            logger.info(f"Saved prediction log for user: {user_id}")
        except Exception as e:
            logger.error(f"Failed to save prediction log for user {user_id}: {str(e)}")
            
    return response_data

@router.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_batch(
    payload: BatchPredictionRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Perform batch predictions for water quality in parallel.
    Logs each prediction to Data Service if user is authenticated.
    """
    async def process_single_prediction(data_item: dict) -> PredictionResponse:
        ml_payload = map_frontend_to_ml(data_item)
        ml_result = await ml_client.predict(ml_payload)
        
        response_item = PredictionResponse(
            predicted_class_id=ml_result["label"],
            predicted_suitability_tier=ml_result["tier"],
            probabilities=ml_result["probabilities"]
        )
        
        if user:
            user_id = user.get("sub")
            log_payload = {
                "user_id": user_id,
                "input_data": data_item,
                "predicted_class_id": response_item.predicted_class_id,
                "predicted_suitability_tier": response_item.predicted_suitability_tier,
                "probabilities": response_item.probabilities
            }
            try:
                await data_client.save_prediction_log(log_payload)
            except Exception as e:
                logger.error(f"Failed to save prediction log in batch: {str(e)}")
                
        return response_item

    # Process all predictions concurrently
    tasks = [process_single_prediction(item) for item in payload.data]
    results = await asyncio.gather(*tasks)
    return list(results)
