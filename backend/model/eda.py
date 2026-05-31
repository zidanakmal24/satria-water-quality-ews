from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import mlflow
import numpy as np
import pandas as pd
import seaborn as sns

try:
    from backend.model.preprocessing import (
        MLRUNS_DIR,
        PROCESSED_DIR,
        RAW_DATA_PATH,
        TARGET_COLUMN,
        clean_data,
        read_raw_data,
    )
except ModuleNotFoundError:
    from preprocessing import (
        MLRUNS_DIR,
        PROCESSED_DIR,
        RAW_DATA_PATH,
        TARGET_COLUMN,
        clean_data,
        read_raw_data,
    )


EDA_DIR = PROCESSED_DIR / "eda"


def configure_mlflow(experiment_name: str = "EWS_EDA") -> None:
    mlflow.set_tracking_uri(MLRUNS_DIR.as_uri())
    mlflow.set_experiment(experiment_name)


def _safe_name(name: str) -> str:
    return (
        name.lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("(", "")
        .replace(")", "")
        .replace("-", "_")
    )


def _write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def create_plots(df: pd.DataFrame, numeric_cols: list[str]) -> dict[str, Path]:
    EDA_DIR.mkdir(parents=True, exist_ok=True)
    plot_paths: dict[str, Path] = {}

    corr_path = EDA_DIR / "correlation_heatmap.png"
    fig, ax = plt.subplots(figsize=(12, 8))
    sns.heatmap(df[numeric_cols].corr(), cmap="coolwarm", center=0, ax=ax)
    ax.set_title("Correlation Heatmap")
    fig.tight_layout()
    fig.savefig(corr_path, dpi=160)
    plt.close(fig)
    plot_paths["correlation_heatmap"] = corr_path

    target_path = EDA_DIR / "target_distribution.png"
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.countplot(data=df, x=TARGET_COLUMN, order=df[TARGET_COLUMN].value_counts().index, ax=ax)
    ax.set_title("Target Distribution")
    ax.tick_params(axis="x", rotation=20)
    fig.tight_layout()
    fig.savefig(target_path, dpi=160)
    plt.close(fig)
    plot_paths["target_distribution"] = target_path

    selected_cols = numeric_cols[:8]
    for col in selected_cols:
        safe = _safe_name(col)

        hist_path = EDA_DIR / f"hist_{safe}.png"
        fig, ax = plt.subplots(figsize=(7, 4))
        sns.histplot(df[col], kde=True, ax=ax)
        ax.set_title(f"Distribution: {col}")
        fig.tight_layout()
        fig.savefig(hist_path, dpi=160)
        plt.close(fig)
        plot_paths[f"hist_{safe}"] = hist_path

        box_path = EDA_DIR / f"boxplot_{safe}.png"
        fig, ax = plt.subplots(figsize=(8, 4))
        sns.boxplot(data=df, x=TARGET_COLUMN, y=col, ax=ax)
        ax.set_title(f"Boxplot: {col}")
        ax.tick_params(axis="x", rotation=20)
        fig.tight_layout()
        fig.savefig(box_path, dpi=160)
        plt.close(fig)
        plot_paths[f"boxplot_{safe}"] = box_path

    return plot_paths


def run_eda() -> dict[str, object]:
    configure_mlflow()
    EDA_DIR.mkdir(parents=True, exist_ok=True)

    raw = read_raw_data()
    df = clean_data(raw)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    missing = df.isna().sum().sort_values(ascending=False)
    missing_path = EDA_DIR / "missing_values.csv"
    dtypes_path = EDA_DIR / "data_types.csv"
    describe_path = EDA_DIR / "descriptive_statistics.csv"
    target_path = EDA_DIR / "target_distribution.csv"
    sample_path = EDA_DIR / "clean_sample.csv"
    summary_path = EDA_DIR / "eda_summary.json"

    missing.rename("missing_count").to_csv(missing_path, header=True)
    df.dtypes.astype(str).rename("dtype").to_csv(dtypes_path, header=True)
    df[numeric_cols].describe().to_csv(describe_path)
    df[TARGET_COLUMN].value_counts().rename("count").to_csv(target_path, header=True)
    df.head(20).to_csv(sample_path, index=False)

    summary = {
        "raw_rows": int(raw.shape[0]),
        "raw_columns": int(raw.shape[1]),
        "cleaned_rows": int(df.shape[0]),
        "cleaned_columns": int(df.shape[1]),
        "duplicate_rows": int(raw.duplicated().sum()),
        "missing_total": int(df.isna().sum().sum()),
        "numeric_columns": numeric_cols,
        "target_column": TARGET_COLUMN,
        "target_distribution": df[TARGET_COLUMN].value_counts().to_dict(),
        "output_dir": str(EDA_DIR),
    }
    _write_json(summary_path, summary)

    plot_paths = create_plots(df, numeric_cols)
    artifact_paths = [
        missing_path,
        dtypes_path,
        describe_path,
        target_path,
        sample_path,
        summary_path,
        *plot_paths.values(),
    ]

    with mlflow.start_run(run_name="eda_full_pipeline"):
        mlflow.log_param("raw_dataset", str(RAW_DATA_PATH))
        mlflow.log_param("separator", ";")
        mlflow.log_param("target_column", TARGET_COLUMN)
        mlflow.log_metric("raw_rows", raw.shape[0])
        mlflow.log_metric("raw_columns", raw.shape[1])
        mlflow.log_metric("cleaned_rows", df.shape[0])
        mlflow.log_metric("cleaned_columns", df.shape[1])
        mlflow.log_metric("duplicate_rows", raw.duplicated().sum())
        mlflow.log_metric("missing_total", df.isna().sum().sum())
        mlflow.log_metric("numeric_column_count", len(numeric_cols))

        for label, count in df[TARGET_COLUMN].value_counts().items():
            mlflow.log_metric(f"class_{_safe_name(str(label))}", int(count))

        for path in artifact_paths:
            mlflow.log_artifact(str(path))

    return {"summary": summary, "artifact_paths": artifact_paths}


def main() -> None:
    argparse.ArgumentParser(description="Run aquaculture exploratory data analysis.").parse_args()
    result = run_eda()
    summary = result["summary"]
    print("EDA selesai.")
    print(f"Raw shape      : ({summary['raw_rows']}, {summary['raw_columns']})")
    print(f"Cleaned shape  : ({summary['cleaned_rows']}, {summary['cleaned_columns']})")
    print(f"Missing total  : {summary['missing_total']}")
    print(f"Duplicate rows : {summary['duplicate_rows']}")
    print("Target distribution:")
    for label, count in summary["target_distribution"].items():
        print(f"- {label}: {count}")
    print(f"Output dir     : {EDA_DIR}")
    print(f"MLflow tracking: {MLRUNS_DIR}")


if __name__ == "__main__":
    main()
