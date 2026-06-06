import os
import shutil
import json
from pathlib import Path
import mlflow
from mlflow.client import MlflowClient

def download_production_model():
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    client = MlflowClient()

    model_name = "EWS_Water_Quality_Classifier"
    
    # Target directory untuk artifacts
    target_dir = Path(__file__).resolve().parents[1] / "app" / "domains" / "water" / "artifacts"
    target_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Mengambil info model '{model_name}' dari registry di {tracking_uri}...")
    
    try:
        # Dapatkan versi model terbaru (mencakup Production, Staging, atau None)
        versions = client.get_latest_versions(model_name, stages=["Production", "Staging", "None"])
    except Exception as e:
        print(f"Error saat menghubungi MLflow Server atau mencari model: {e}")
        print("Pastikan MLflow Server berjalan dan model sudah di-register.")
        raise e
        
    if not versions:
        raise ValueError(f"Model '{model_name}' tidak ditemukan di registry. Pastikan skrip training sudah dijalankan.")
    
    # Pilih versi terbaru berdasarkan version number
    latest_version_info = max(versions, key=lambda v: int(v.version))
    run_id = latest_version_info.run_id
    version = latest_version_info.version
    
    print(f"Menggunakan Model Version {version} dari Run ID {run_id}")
    
    # 1. Download Model Pipeline (.pkl)
    # Model disimpan sebagai flavor sklearn di path 'best_pipeline'
    model_uri = f"runs:/{run_id}/best_pipeline"
    print(f"Mendownload model pipeline dari {model_uri}...")
    local_model_dir = mlflow.artifacts.download_artifacts(artifact_uri=model_uri)
    
    # Model pkl di dalam folder model biasanya bernama 'model.pkl'
    src_pkl = Path(local_model_dir) / "model.pkl"
    dest_pkl = target_dir / "water_quality_pipeline.pkl"
    
    if src_pkl.exists():
        shutil.copy(src_pkl, dest_pkl)
        print(f"Model pkl berhasil disalin ke {dest_pkl}")
    else:
        raise FileNotFoundError(f"File model.pkl tidak ditemukan di folder model: {local_model_dir}")
        
    # 2. Download Model Metadata (model_metadata.json)
    metadata_uri = f"runs:/{run_id}/model_metadata.json"
    print(f"Mendownload metadata dari {metadata_uri}...")
    local_metadata_file = mlflow.artifacts.download_artifacts(artifact_uri=metadata_uri)
    
    dest_metadata = target_dir / "model_metadata.json"
    shutil.copy(local_metadata_file, dest_metadata)
    print(f"Metadata berhasil disalin ke {dest_metadata}")
    
    print("Download model & metadata selesai.")

if __name__ == "__main__":
    download_production_model()
