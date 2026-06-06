from pydantic import BaseModel, Field
from typing import Dict, Optional

class WaterQualityInput(BaseModel):
    temperature: Optional[float] = Field(None, alias="Temperature")
    turbidity: Optional[float] = Field(None, alias="Turbidity (cm)")
    dissolved_oxygen: Optional[float] = Field(None, alias="Dissolved Oxygen (mg/L)")
    biochemical_oxygen_demand: Optional[float] = Field(None, alias="Biochemical Oxygen Demand (mg/L)")
    carbon_dioxide: Optional[float] = Field(None, alias="Carbon Dioxide (CO2)")
    ph: Optional[float] = Field(None, alias="pH")
    total_alkalinity: Optional[float] = Field(None, alias="Total Alkalinity (mg L-1)")
    total_hardness: Optional[float] = Field(None, alias="Total Hardness (mg L-1)")
    calcium: Optional[float] = Field(None, alias="Calcium (mg L-1)")
    ammonia: Optional[float] = Field(None, alias="Ammonia (mg L-1)")
    nitrite: Optional[float] = Field(None, alias="Nitrite (mg L-1)")
    phosphorus: Optional[float] = Field(None, alias="Phosphorus (mg L-1)")
    hydrogen_sulfide: Optional[float] = Field(None, alias="Hydrogen Sulfide (mg L-1)")
    plankton_count: Optional[float] = Field(None, alias="Plankton Count (No. L-1)")

    class Config:
        populate_by_name = True

class PredictionResponse(BaseModel):
    label: int = Field(..., description="Encoded label prediction (integer)")
    tier: str = Field(..., description="Descriptive Aquaculture Suitability Tier name")
    probabilities: Dict[str, float] = Field(..., description="Probability of prediction for each class")
    model_version: str = Field(..., description="Version of the model used for inference")

class ModelMetadataInfo(BaseModel):
    model_name: str
    model_version: str
    classes: list[str]
    features: list[str]
