from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd

from .preprocessing import TARGET_COLUMN, clean_data, read_raw_data
from .train import MODEL_PATH


def load_model_bundle(model_path: Path = MODEL_PATH) -> dict:
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model belum ditemukan: {model_path}. Jalankan training dulu dengan "
            "`venv\\Scripts\\python.exe backend\\model\\train.py`."
        )
    return joblib.load(model_path)


def _coerce_input_columns(df: pd.DataFrame, features: list[str]) -> pd.DataFrame:
    missing = [col for col in features if col not in df.columns]
    if missing:
        raise ValueError(f"Kolom input kurang: {missing}")

    X = df[features].copy()
    for col in features:
        X[col] = pd.to_numeric(X[col], errors="coerce")

    if X.isna().any().any():
        bad_columns = X.columns[X.isna().any()].tolist()
        raise ValueError(f"Ada nilai input kosong/tidak numerik di kolom: {bad_columns}")

    return X


def predict_dataframe(df: pd.DataFrame, model_path: Path = MODEL_PATH) -> pd.DataFrame:
    bundle = load_model_bundle(model_path)
    model = bundle["model"]
    features = bundle["features"]
    classes = bundle["classes"]

    X = _coerce_input_columns(df, features)
    pred_codes = model.predict(X)
    pred_labels = [classes[int(code)] for code in pred_codes]

    result = df.copy()
    result["predicted_class_id"] = pred_codes
    result["predicted_suitability_tier"] = pred_labels

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        for idx, class_name in enumerate(classes):
            safe_name = class_name.lower().replace(" ", "_")
            result[f"probability_{safe_name}"] = probabilities[:, idx]

    return result


def load_input_from_json(json_text: str) -> pd.DataFrame:
    payload = json.loads(json_text)
    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list):
        raise ValueError("Input JSON harus object atau list of object.")
    return pd.DataFrame(payload)


def load_sample_input() -> pd.DataFrame:
    raw = read_raw_data()
    cleaned = clean_data(raw)
    return cleaned.drop(columns=[TARGET_COLUMN], errors="ignore").head(5)


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict water quality suitability tier.")
    parser.add_argument("--json", help="Input JSON object/list.")
    parser.add_argument("--csv", type=Path, help="Input CSV path.")
    parser.add_argument("--output", type=Path, help="Optional output CSV path.")
    parser.add_argument("--model", type=Path, default=MODEL_PATH)
    parser.add_argument("--sample", action="store_true", help="Predict 5 sample rows from raw dataset.")
    args = parser.parse_args()

    selected_inputs = sum(bool(value) for value in [args.json, args.csv, args.sample])
    if selected_inputs != 1:
        raise SystemExit("Pilih salah satu input: --json, --csv, atau --sample.")

    if args.json:
        input_df = load_input_from_json(args.json)
    elif args.csv:
        input_df = pd.read_csv(args.csv)
    else:
        input_df = load_sample_input()

    result = predict_dataframe(input_df, model_path=args.model)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        result.to_csv(args.output, index=False)
        print(f"Hasil prediksi disimpan ke: {args.output}")
    else:
        print(result.to_string(index=False))


if __name__ == "__main__":
    main()
