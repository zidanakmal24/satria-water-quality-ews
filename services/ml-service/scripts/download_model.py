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
    
    version_to_use = None
    
    try:
        # 1. Coba gunakan Alias 'champion' (Best Practice Modern MLflow >= 2.0)
        try:
            alias_info = client.get_model_version_by_alias(model_name, "champion")
            version_to_use = alias_info
            print(f"[-] Model ditemukan menggunakan Alias: 'champion' (Versi {alias_info.version})")
        except Exception:
            pass
            
        # 2. Fallback: Cari di Stage 'Production' (Best Practice MLflow Klasik)
        if not version_to_use:
            prod_versions = client.get_latest_versions(model_name, stages=["Production"])
            if prod_versions:
                version_to_use = prod_versions[0]
                print(f"[-] Model ditemukan di Stage: 'Production' (Versi {version_to_use.version})")
                
        # 3. Fallback: Cari di Stage 'Staging'
        if not version_to_use:
            staging_versions = client.get_latest_versions(model_name, stages=["Staging"])
            if staging_versions:
                version_to_use = staging_versions[0]
                print(f"[!] Tidak ada Production/Champion. Fallback ke Stage: 'Staging' (Versi {version_to_use.version})")

        # 4. Fallback Terakhir: Ambil versi absolut tertinggi (None/Bebas)
        if not version_to_use:
            all_versions = client.get_latest_versions(model_name, stages=["Production", "Staging", "None"])
            if all_versions:
                version_to_use = max(all_versions, key=lambda v: int(v.version))
                print(f"[!] Menggunakan Fallback Darurat: Versi terbaru absolut (Versi {version_to_use.version}, belum di-approve)")
                
    except Exception as e:
        print(f"Error saat menghubungi MLflow Server atau mencari model: {e}")
        print("Pastikan MLflow Server berjalan dan model sudah di-register.")
        raise e
        
    if not version_to_use:
        raise ValueError(f"Model '{model_name}' tidak ditemukan di registry. Pastikan skrip training sudah dijalankan.")
    
    run_id = version_to_use.run_id
    version = version_to_use.version
    
    print(f"\n=> MENYIAPKAN MODEL VERSION {version} (Run ID: {run_id})")
    
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
