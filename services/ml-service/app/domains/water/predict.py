import json
import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from typing import Dict, Any
from .schema import WaterQualityInput, PredictionResponse

class WaterQualityPredictor:
    def __init__(self):
        self.artifacts_dir = Path(__file__).resolve().parent / "artifacts"
        self.model_path = self.artifacts_dir / "water_quality_pipeline.pkl"
        self.metadata_path = self.artifacts_dir / "model_metadata.json"
        
        self.model = None
        self.metadata = None
        self.classes = []
        self.features = []
        self.model_version = "unknown"
        
        self.load_model()

    def load_model(self):
        if not self.model_path.exists() or not self.metadata_path.exists():
            print(f"WARNING: Model artifacts tidak ditemukan di {self.artifacts_dir}.")
            return
            
        try:
            self.model = joblib.load(self.model_path)
            with open(self.metadata_path, "r") as f:
                self.metadata = json.load(f)
            
            self.classes = self.metadata.get("classes", [])
            self.features = self.metadata.get("features", [])
            self.model_version = self.metadata.get("model_version", "1.0.0")
            print(f"Model berhasil di-load. Versi: {self.model_version}. Features: {self.features}")
        except Exception as e:
            print(f"ERROR: Gagal me-load model: {e}")
            raise e

    def predict(self, data: WaterQualityInput) -> PredictionResponse:
        if self.model is None:
            self.load_model()
            if self.model is None:
                raise RuntimeError("Model tidak ter-load di memori. Jalankan script download_model.py terlebih dahulu.")
        
        input_dict = data.dict(by_alias=True)
        
        # Pastikan data terurut sesuai dengan urutan feature yang diharapkan oleh model
        ordered_data = {feat: [input_dict.get(feat)] for feat in self.features}
        df_input = pd.DataFrame(ordered_data)
        
        # Prediksi label integer
        pred_label = int(self.model.predict(df_input)[0])
        
        # Prediksi probabilitas
        prob_scores = self.model.predict_proba(df_input)[0]
        
        # Mapping label integer kembali ke deskripsi string
        tier_name = self.classes[pred_label] if pred_label < len(self.classes) else "Unknown"
        
        # Dictionary probabilitas untuk respon API
        probabilities = {
            self.classes[i]: float(prob_scores[i]) for i in range(len(self.classes))
        }
        
        return PredictionResponse(
            label=pred_label,
            tier=tier_name,
            probabilities=probabilities,
            model_version=self.model_version
        )
