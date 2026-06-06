from __future__ import annotations

import argparse
import os
from pathlib import Path

import pandas as pd
import requests

try:
    from backend.model.preprocessing import PROCESSED_DIR, run_preprocessing
except ModuleNotFoundError:
    from preprocessing import PROCESSED_DIR, run_preprocessing


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CSV_PATH = PROCESSED_DIR / "aquaculture_cleaned.csv"

COLUMN_MAP = {
    "Temperature": "temperature",
    "Turbidity (cm)": "turbidity_cm",
    "Dissolved Oxygen (mg/L)": "dissolved_oxygen_mg_l",
    "Biochemical Oxygen Demand (mg/L)": "biochemical_oxygen_demand_mg_l",
    "Carbon Dioxide (CO2)": "carbon_dioxide_co2",
    "pH": "ph",
    "Total Alkalinity (mg L-1)": "total_alkalinity_mg_l_1",
    "Total Hardness (mg L-1)": "total_hardness_mg_l_1",
    "Calcium (mg L-1)": "calcium_mg_l_1",
    "Ammonia (mg L-1)": "ammonia_mg_l_1",
    "Nitrite (mg L-1)": "nitrite_mg_l_1",
    "Phosphorus (mg L-1)": "phosphorus_mg_l_1",
    "Hydrogen Sulfide (mg L-1)": "hydrogen_sulfide_mg_l_1",
    "Plankton Count (No. L-1)": "plankton_count_no_l_1",
    "Water Quality Label": "water_quality_label",
    "Aquaculture Suitability Tier": "aquaculture_suitability_tier",
    "Aquaculture Suitability Description": "aquaculture_suitability_description",
}


def load_clean_dataset(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        print("Dataset clean belum ada. Menjalankan preprocessing dulu...")
        run_preprocessing()

    df = pd.read_csv(csv_path)
    missing_columns = sorted(set(COLUMN_MAP) - set(df.columns))
    if missing_columns:
        raise ValueError(f"Kolom tidak ditemukan di dataset clean: {missing_columns}")

    df = df.rename(columns=COLUMN_MAP)
    return df[list(COLUMN_MAP.values())].where(pd.notnull(df), None)


def upload_dataframe(df: pd.DataFrame, table_name: str, batch_size: int) -> int:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if supabase_url.endswith("/rest/v1"):
        supabase_url = supabase_url[: -len("/rest/v1")]
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di file .env."
        )

    endpoint = f"{supabase_url}/rest/v1/{table_name}"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    total_uploaded = 0
    for start in range(0, len(df), batch_size):
        batch = df.iloc[start : start + batch_size].to_dict(orient="records")
        response = requests.post(endpoint, headers=headers, json=batch, timeout=60)
        if response.status_code >= 400:
            raise RuntimeError(
                f"Gagal upload batch {start}-{start + len(batch)}: "
                f"{response.status_code} {response.text}"
            )

        total_uploaded += len(batch)
        print(f"Uploaded {total_uploaded}/{len(df)} rows")

    return total_uploaded


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload cleaned dataset to Supabase.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV_PATH)
    parser.add_argument("--table", default=os.getenv("SUPABASE_TABLE", "water_quality_clean"))
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()

    load_env_file(PROJECT_ROOT / ".env")
    table_name = args.table or os.getenv("SUPABASE_TABLE", "water_quality_clean")

    df = load_clean_dataset(args.csv)
    uploaded = upload_dataframe(df, table_name=table_name, batch_size=args.batch_size)
    print(f"Selesai upload {uploaded} rows ke tabel Supabase: {table_name}")


if __name__ == "__main__":
    main()
