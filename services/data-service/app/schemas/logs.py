from pydantic import BaseModel
from typing import Dict, Optional, Any

class PredictionLogCreate(BaseModel):
    user_id: str
    input_data: Dict[str, float]
    predicted_class_id: int
    predicted_suitability_tier: str
    probabilities: Dict[str, float]

class PredictionLog(BaseModel):
    id: int
    created_at: str
    user_id: Optional[str] = None
    input_data: Dict[str, Any]
    predicted_suitability_tier: str
    probabilities: Optional[Dict[str, float]] = None

    class Config:
        from_attributes = True
