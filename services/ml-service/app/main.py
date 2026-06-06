import os
from fastapi import FastAPI, HTTPException, status
from .domains.water.predict import WaterQualityPredictor
from .domains.water.schema import WaterQualityInput, PredictionResponse, ModelMetadataInfo

app = FastAPI(
    title="SATRIA Water Quality EWS - ML Inference Service",
    description="Microservice untuk inferensi model kualitas air secara offline (in-memory)",
    version="1.0.0"
)

# Global predictor instance
predictor = None

@app.on_event("startup")
def startup_event():
    global predictor
    print("Starting ML Inference Service...")
    predictor = WaterQualityPredictor()

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    if predictor is None or predictor.model is None:
        return {"status": "unhealthy", "message": "Model not loaded yet"}
    return {"status": "healthy", "model_version": predictor.model_version}

@app.get("/model-info", response_model=ModelMetadataInfo)
def model_info():
    if predictor is None or predictor.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model belum dimuat ke memori. Hubungi administrator."
        )
    return ModelMetadataInfo(
        model_name="EWS_Water_Quality_Classifier",
        model_version=predictor.model_version,
        classes=predictor.classes,
        features=predictor.features
    )

@app.post("/predict", response_model=PredictionResponse)
def predict_water_quality(payload: WaterQualityInput):
    if predictor is None or predictor.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model belum dimuat ke memori. Jalankan download_model.py terlebih dahulu."
        )
    try:
        result = predictor.predict(payload)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat inferensi model: {str(e)}"
        )
