from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import joblib
import mlflow
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, RobustScaler


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "Refined_Aquaculture_Water_Suitability_Signals.csv"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
ARTIFACT_DIR = PROJECT_ROOT / "models" / "preprocessing"
MLRUNS_DIR = PROJECT_ROOT / "mlruns"

TARGET_COLUMN = "Aquaculture Suitability Tier"
DROP_COLUMNS = ["Aquaculture Suitability Description"]
RANDOM_STATE = 42


def configure_mlflow(experiment_name: str = "EWS_Preprocessing") -> None:
    mlflow.set_tracking_uri(MLRUNS_DIR.as_uri())
    mlflow.set_experiment(experiment_name)


def read_raw_data(path: Path = RAW_DATA_PATH) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset tidak ditemukan: {path}")

    df = pd.read_csv(path, sep=";", engine="python")
    if df.shape[1] == 1:
        raise ValueError(
            "Dataset hanya terbaca 1 kolom. Pastikan CSV dibaca dengan separator ';'."
        )
    return df


def _parse_number(value: object) -> float:
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float, np.number)):
        return float(value)

    text = str(value).strip().replace(",", ".")
    if text == "":
        return np.nan

    if text.count(".") > 1:
        head, tail = text.rsplit(".", 1)
        text = head.replace(".", "") + "." + tail

    return pd.to_numeric(text, errors="coerce")


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()
    cleaned.columns = cleaned.columns.str.strip()
    cleaned = cleaned.drop_duplicates().reset_index(drop=True)

    numeric_candidates = [
        col
        for col in cleaned.columns
        if col not in [TARGET_COLUMN, "Aquaculture Suitability Description"]
    ]
    for col in numeric_candidates:
        cleaned[col] = cleaned[col].map(_parse_number)

    return cleaned


def build_feature_target(
    df: pd.DataFrame,
    target_column: str = TARGET_COLUMN,
    drop_columns: Iterable[str] = DROP_COLUMNS,
) -> tuple[pd.DataFrame, pd.Series, LabelEncoder]:
    if target_column not in df.columns:
        raise KeyError(f"Kolom target '{target_column}' tidak ditemukan.")

    feature_df = df.drop(columns=[target_column, *drop_columns], errors="ignore")
    target = df[target_column].astype(str).str.strip()

    numeric_features = feature_df.select_dtypes(include=[np.number]).columns.tolist()
    feature_df = feature_df[numeric_features].copy()
    feature_df = feature_df.fillna(feature_df.median(numeric_only=True))

    label_encoder = LabelEncoder()
    encoded_target = pd.Series(
        label_encoder.fit_transform(target),
        name=target_column,
        index=df.index,
    )
    return feature_df, encoded_target, label_encoder


def save_outputs(
    cleaned: pd.DataFrame,
    X_train_scaled: np.ndarray,
    X_test_scaled: np.ndarray,
    y_train: pd.Series,
    y_test: pd.Series,
    feature_names: list[str],
    scaler: RobustScaler,
    label_encoder: LabelEncoder,
) -> dict[str, Path]:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    cleaned_path = PROCESSED_DIR / "aquaculture_cleaned.csv"
    train_path = PROCESSED_DIR / "train_preprocessed.csv"
    test_path = PROCESSED_DIR / "test_preprocessed.csv"
    summary_path = PROCESSED_DIR / "preprocessing_summary.json"
    scaler_path = ARTIFACT_DIR / "robust_scaler.joblib"
    encoder_path = ARTIFACT_DIR / "target_label_encoder.joblib"

    cleaned.to_csv(cleaned_path, index=False)

    train_df = pd.DataFrame(X_train_scaled, columns=feature_names)
    train_df[TARGET_COLUMN] = y_train.to_numpy()
    test_df = pd.DataFrame(X_test_scaled, columns=feature_names)
    test_df[TARGET_COLUMN] = y_test.to_numpy()
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)

    joblib.dump(scaler, scaler_path)
    joblib.dump(label_encoder, encoder_path)

    summary = {
        "cleaned_rows": int(cleaned.shape[0]),
        "cleaned_columns": int(cleaned.shape[1]),
        "train_rows": int(train_df.shape[0]),
        "test_rows": int(test_df.shape[0]),
        "feature_count": len(feature_names),
        "features": feature_names,
        "target_column": TARGET_COLUMN,
        "target_classes": label_encoder.classes_.tolist(),
        "output_files": {
            "cleaned": str(cleaned_path),
            "train": str(train_path),
            "test": str(test_path),
            "scaler": str(scaler_path),
            "label_encoder": str(encoder_path),
        },
    }
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    return {
        "cleaned": cleaned_path,
        "train": train_path,
        "test": test_path,
        "summary": summary_path,
        "scaler": scaler_path,
        "label_encoder": encoder_path,
    }


def run_preprocessing(test_size: float = 0.2) -> dict[str, object]:
    configure_mlflow()

    raw = read_raw_data()
    cleaned = clean_data(raw)
    X, y, label_encoder = build_feature_target(cleaned)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    paths = save_outputs(
        cleaned=cleaned,
        X_train_scaled=X_train_scaled,
        X_test_scaled=X_test_scaled,
        y_train=y_train,
        y_test=y_test,
        feature_names=X.columns.tolist(),
        scaler=scaler,
        label_encoder=label_encoder,
    )

    with mlflow.start_run(run_name="preprocessing_pipeline"):
        mlflow.log_param("raw_dataset", str(RAW_DATA_PATH))
        mlflow.log_param("separator", ";")
        mlflow.log_param("target_column", TARGET_COLUMN)
        mlflow.log_param("scaler", "RobustScaler")
        mlflow.log_param("test_size", test_size)
        mlflow.log_metric("raw_rows", raw.shape[0])
        mlflow.log_metric("raw_columns", raw.shape[1])
        mlflow.log_metric("cleaned_rows", cleaned.shape[0])
        mlflow.log_metric("cleaned_columns", cleaned.shape[1])
        mlflow.log_metric("duplicate_rows_removed", raw.shape[0] - cleaned.shape[0])
        mlflow.log_metric("missing_after_cleaning", int(cleaned.isna().sum().sum()))
        mlflow.log_metric("feature_count", X.shape[1])
        mlflow.log_metric("train_rows", X_train.shape[0])
        mlflow.log_metric("test_rows", X_test.shape[0])

        for path in paths.values():
            mlflow.log_artifact(str(path))

    return {
        "raw_shape": raw.shape,
        "cleaned_shape": cleaned.shape,
        "train_shape": (X_train.shape[0], X_train.shape[1] + 1),
        "test_shape": (X_test.shape[0], X_test.shape[1] + 1),
        "paths": paths,
        "classes": label_encoder.classes_.tolist(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run aquaculture data preprocessing.")
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    result = run_preprocessing(test_size=args.test_size)
    print("Preprocessing selesai.")
    print(f"Raw shape      : {result['raw_shape']}")
    print(f"Cleaned shape  : {result['cleaned_shape']}")
    print(f"Train shape    : {result['train_shape']}")
    print(f"Test shape     : {result['test_shape']}")
    print(f"Target classes : {result['classes']}")
    print("Output files:")
    for name, path in result["paths"].items():
        print(f"- {name}: {path}")
    print(f"MLflow tracking: {MLRUNS_DIR}")


if __name__ == "__main__":
    main()
