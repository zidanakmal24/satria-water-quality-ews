from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from backend.model.predict import load_model_bundle, predict_dataframe
from backend.model.train import METADATA_PATH, MODEL_PATH


PROJECT_ROOT = Path(__file__).resolve().parents[2]

API_TO_MODEL_COLUMNS = {
    "temperature": "Temperature",
    "turbidity_cm": "Turbidity (cm)",
    "dissolved_oxygen_mg_l": "Dissolved Oxygen (mg/L)",
    "biochemical_oxygen_demand_mg_l": "Biochemical Oxygen Demand (mg/L)",
    "carbon_dioxide_co2": "Carbon Dioxide (CO2)",
    "ph": "pH",
    "total_alkalinity_mg_l_1": "Total Alkalinity (mg L-1)",
    "total_hardness_mg_l_1": "Total Hardness (mg L-1)",
    "calcium_mg_l_1": "Calcium (mg L-1)",
    "ammonia_mg_l_1": "Ammonia (mg L-1)",
    "nitrite_mg_l_1": "Nitrite (mg L-1)",
    "phosphorus_mg_l_1": "Phosphorus (mg L-1)",
    "hydrogen_sulfide_mg_l_1": "Hydrogen Sulfide (mg L-1)",
    "plankton_count_no_l_1": "Plankton Count (No. L-1)",
}


class WaterQualityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    temperature: float = Field(..., example=27.5)
    turbidity_cm: float = Field(..., example=45.0)
    dissolved_oxygen_mg_l: float = Field(..., example=6.8)
    biochemical_oxygen_demand_mg_l: float = Field(..., example=3.2)
    carbon_dioxide_co2: float = Field(..., example=8.4)
    ph: float = Field(..., example=7.4)
    total_alkalinity_mg_l_1: float = Field(..., example=120.0)
    total_hardness_mg_l_1: float = Field(..., example=180.0)
    calcium_mg_l_1: float = Field(..., example=70.0)
    ammonia_mg_l_1: float = Field(..., example=0.05)
    nitrite_mg_l_1: float = Field(..., example=0.02)
    phosphorus_mg_l_1: float = Field(..., example=0.3)
    hydrogen_sulfide_mg_l_1: float = Field(..., example=0.01)
    plankton_count_no_l_1: float = Field(..., example=2500.0)


class PredictionRequest(BaseModel):
    data: WaterQualityInput
    save_to_supabase: bool = Field(False, description="Set true untuk simpan hasil prediksi.")


class BatchPredictionRequest(BaseModel):
    data: list[WaterQualityInput]
    save_to_supabase: bool = Field(False, description="Set true untuk simpan hasil prediksi.")


class PredictionResponse(BaseModel):
    predicted_class_id: int
    predicted_suitability_tier: str
    probabilities: dict[str, float]
    saved_to_supabase: bool = False


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(PROJECT_ROOT / ".env")


app = FastAPI(
    title="SATRIA Water Quality EWS API",
    description="Prediction API untuk klasifikasi kualitas air akuakultur.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def get_model_bundle() -> dict[str, Any]:
    try:
        return load_model_bundle(MODEL_PATH)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@lru_cache(maxsize=1)
def get_model_metadata() -> dict[str, Any]:
    if not METADATA_PATH.exists():
        return {}
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))


def inputs_to_model_dataframe(items: list[WaterQualityInput]) -> pd.DataFrame:
    records = []
    for item in items:
        api_record = item.model_dump()
        model_record = {
            model_col: api_record[api_col]
            for api_col, model_col in API_TO_MODEL_COLUMNS.items()
        }
        records.append(model_record)
    return pd.DataFrame(records)


def prediction_rows_to_response(rows: pd.DataFrame) -> list[PredictionResponse]:
    responses = []
    probability_columns = [col for col in rows.columns if col.startswith("probability_")]

    for _, row in rows.iterrows():
        probabilities = {
            col.replace("probability_", ""): float(row[col])
            for col in probability_columns
        }
        responses.append(
            PredictionResponse(
                predicted_class_id=int(row["predicted_class_id"]),
                predicted_suitability_tier=str(row["predicted_suitability_tier"]),
                probabilities=probabilities,
            )
        )
    return responses


def normalize_supabase_url(url: str) -> str:
    url = url.rstrip("/")
    if url.endswith("/rest/v1"):
        return url[: -len("/rest/v1")]
    return url


def save_predictions_to_supabase(input_items: list[WaterQualityInput], predictions: list[PredictionResponse]) -> bool:
    supabase_url = normalize_supabase_url(os.getenv("SUPABASE_URL", ""))
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    table_name = os.getenv("SUPABASE_PREDICTION_TABLE", "prediction_results")

    if not supabase_url or not key:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum tersedia di .env.",
        )

    payload = []
    for item, prediction in zip(input_items, predictions):
        payload.append(
            {
                "input_data": item.model_dump(),
                "predicted_class_id": prediction.predicted_class_id,
                "predicted_suitability_tier": prediction.predicted_suitability_tier,
                "probabilities": prediction.probabilities,
            }
        )

    response = requests.post(
        f"{supabase_url}/rest/v1/{table_name}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=payload,
        timeout=30,
    )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Gagal menyimpan prediksi ke Supabase: {response.status_code} {response.text}",
        )
    return True


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "SATRIA Water Quality EWS API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    bundle = get_model_bundle()
    return {
        "status": "ok",
        "model_loaded": True,
        "model_name": bundle.get("model_name"),
    }


@app.get("/model-info")
def model_info() -> dict[str, Any]:
    metadata = get_model_metadata()
    if not metadata:
        raise HTTPException(status_code=404, detail="Metadata model belum ditemukan.")
    return metadata


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    df = inputs_to_model_dataframe([request.data])
    rows = predict_dataframe(df, model_path=MODEL_PATH)
    response = prediction_rows_to_response(rows)[0]

    if request.save_to_supabase:
        response.saved_to_supabase = save_predictions_to_supabase([request.data], [response])

    return response


@app.post("/predict/batch", response_model=list[PredictionResponse])
def predict_batch(request: BatchPredictionRequest) -> list[PredictionResponse]:
    if not request.data:
        raise HTTPException(status_code=400, detail="Data batch tidak boleh kosong.")

    df = inputs_to_model_dataframe(request.data)
    rows = predict_dataframe(df, model_path=MODEL_PATH)
    responses = prediction_rows_to_response(rows)

    if request.save_to_supabase:
        saved = save_predictions_to_supabase(request.data, responses)
        for response in responses:
            response.saved_to_supabase = saved

    return responses
