from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import mlflow
import mlflow.sklearn
import pandas as pd
import seaborn as sns
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import RobustScaler

try:
    from lightgbm import LGBMClassifier
except ImportError:
    LGBMClassifier = None

try:
    from backend.model.preprocessing import (
        MLRUNS_DIR,
        PROJECT_ROOT,
        PROCESSED_DIR,
        RANDOM_STATE,
        TARGET_COLUMN,
        build_feature_target,
        clean_data,
        read_raw_data,
    )
except ModuleNotFoundError:
    from preprocessing import (
        MLRUNS_DIR,
        PROJECT_ROOT,
        PROCESSED_DIR,
        RANDOM_STATE,
        TARGET_COLUMN,
        build_feature_target,
        clean_data,
        read_raw_data,
    )


MODEL_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODEL_DIR / "water_quality_classifier.joblib"
METADATA_PATH = MODEL_DIR / "water_quality_classifier_metadata.json"
REPORT_DIR = PROCESSED_DIR / "training"
LEAKAGE_COLUMNS = ["Water Quality Label"]
MODEL_PREFERENCE = ["lightgbm", "random_forest", "gradient_boosting", "decision_tree", "logistic_regression", "baseline_dummy"]


def configure_mlflow(experiment_name: str = "EWS_Model_Training") -> None:
    mlflow.set_tracking_uri(MLRUNS_DIR.as_uri())
    mlflow.set_experiment(experiment_name)


def load_training_data() -> tuple[pd.DataFrame, pd.Series, list[str], list[str]]:
    raw = read_raw_data()
    cleaned = clean_data(raw)
    X, y, label_encoder = build_feature_target(cleaned)
    X = X.drop(columns=LEAKAGE_COLUMNS, errors="ignore")
    return X, y, X.columns.tolist(), label_encoder.classes_.tolist()


def get_candidate_models() -> dict[str, Pipeline]:
    candidates = {
        "baseline_dummy": Pipeline(
            [
                ("scaler", RobustScaler()),
                (
                    "classifier",
                    DummyClassifier(strategy="most_frequent", random_state=RANDOM_STATE),
                ),
            ]
        ),
        "decision_tree": Pipeline(
            [
                ("scaler", RobustScaler()),
                (
                    "classifier",
                    DecisionTreeClassifier(
                        max_depth=10,
                        min_samples_leaf=5,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "logistic_regression": Pipeline(
            [
                ("scaler", RobustScaler()),
                (
                    "classifier",
                    LogisticRegression(
                        max_iter=1000,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("scaler", RobustScaler()),
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=250,
                        max_depth=None,
                        min_samples_leaf=2,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
        "gradient_boosting": Pipeline(
            [
                ("scaler", RobustScaler()),
                (
                    "classifier",
                    GradientBoostingClassifier(random_state=RANDOM_STATE),
                ),
            ]
        ),
    }

    if LGBMClassifier is not None:
        candidates["lightgbm"] = Pipeline(
            [
                ("scaler", RobustScaler()),
                (
                    "classifier",
                    LGBMClassifier(
                        objective="multiclass",
                        n_estimators=300,
                        learning_rate=0.05,
                        num_leaves=31,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                        verbose=-1,
                    ),
                ),
            ]
        )

    return candidates


def evaluate_model(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float]:
    y_pred = model.predict(X_test)
    return {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision_macro": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y_test, y_pred, average="macro", zero_division=0),
        "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
    }


def save_reports(
    model_name: str,
    model: Pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    classes: list[str],
) -> dict[str, Path]:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    y_pred = model.predict(X_test)
    report = classification_report(
        y_test,
        y_pred,
        target_names=classes,
        zero_division=0,
        output_dict=True,
    )
    matrix = confusion_matrix(y_test, y_pred)

    report_path = REPORT_DIR / f"classification_report_{model_name}.json"
    matrix_path = REPORT_DIR / f"confusion_matrix_{model_name}.csv"
    matrix_plot_path = REPORT_DIR / f"confusion_matrix_{model_name}.png"

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    pd.DataFrame(matrix, index=classes, columns=classes).to_csv(matrix_path)

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(
        matrix,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=classes,
        yticklabels=classes,
        ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix: {model_name}")
    fig.tight_layout()
    fig.savefig(matrix_plot_path, dpi=160)
    plt.close(fig)

    return {
        "classification_report": report_path,
        "confusion_matrix_csv": matrix_path,
        "confusion_matrix_plot": matrix_plot_path,
    }


def save_model_bundle(
    model: Pipeline,
    model_name: str,
    metrics: dict[str, float],
    features: list[str],
    classes: list[str],
) -> dict[str, Path]:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    bundle = {
        "model": model,
        "model_name": model_name,
        "features": features,
        "target_column": TARGET_COLUMN,
        "classes": classes,
        "metrics": metrics,
    }
    metadata = {
        "model_name": model_name,
        "features": features,
        "target_column": TARGET_COLUMN,
        "classes": classes,
        "metrics": metrics,
        "model_path": str(MODEL_PATH),
    }

    joblib.dump(bundle, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return {"model": MODEL_PATH, "metadata": METADATA_PATH}


def train_models(test_size: float = 0.2) -> dict[str, object]:
    configure_mlflow()
    X, y, features, classes = load_training_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    candidates = get_candidate_models()
    results: list[dict[str, object]] = []

    with mlflow.start_run(run_name="model_training_comparison"):
        mlflow.log_param("target_column", TARGET_COLUMN)
        mlflow.log_param("test_size", test_size)
        mlflow.log_param("random_state", RANDOM_STATE)
        mlflow.log_metric("train_rows", X_train.shape[0])
        mlflow.log_metric("test_rows", X_test.shape[0])
        mlflow.log_metric("feature_count", X_train.shape[1])

        for name, model in candidates.items():
            with mlflow.start_run(run_name=name, nested=True):
                model.fit(X_train, y_train)
                metrics = evaluate_model(model, X_test, y_test)
                reports = save_reports(name, model, X_test, y_test, classes)

                classifier = model.named_steps["classifier"]
                mlflow.log_param("model_name", name)
                mlflow.log_params(
                    {
                        key: value
                        for key, value in classifier.get_params().items()
                        if isinstance(value, (str, int, float, bool, type(None)))
                    }
                )
                mlflow.log_metrics(metrics)
                for path in reports.values():
                    mlflow.log_artifact(str(path))

                results.append({"name": name, "model": model, "metrics": metrics, "reports": reports})

        preference_rank = {name: index for index, name in enumerate(MODEL_PREFERENCE)}
        best = max(
            results,
            key=lambda item: (
                item["metrics"]["f1_macro"],
                item["metrics"]["recall_macro"],
                -preference_rank.get(item["name"], len(MODEL_PREFERENCE)),
            ),
        )
        saved_paths = save_model_bundle(
            model=best["model"],
            model_name=best["name"],
            metrics=best["metrics"],
            features=features,
            classes=classes,
        )

        mlflow.log_param("best_model", best["name"])
        for metric_name, metric_value in best["metrics"].items():
            mlflow.log_metric(f"best_{metric_name}", metric_value)
        for path in saved_paths.values():
            mlflow.log_artifact(str(path))

        input_example = X_test.head(3)
        mlflow.sklearn.log_model(
            sk_model=best["model"],
            artifact_path="best_model",
            input_example=input_example,
            registered_model_name="EWS_Water_Quality_Classifier",
        )

    leaderboard = [
        {"model": item["name"], **item["metrics"]}
        for item in sorted(
            results,
            key=lambda item: (
                item["metrics"]["f1_macro"],
                item["metrics"]["recall_macro"],
                -MODEL_PREFERENCE.index(item["name"])
                if item["name"] in MODEL_PREFERENCE
                else -len(MODEL_PREFERENCE),
            ),
            reverse=True,
        )
    ]
    return {
        "best_model": best["name"],
        "best_metrics": best["metrics"],
        "leaderboard": leaderboard,
        "model_path": MODEL_PATH,
        "metadata_path": METADATA_PATH,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train water quality classifier.")
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    result = train_models(test_size=args.test_size)
    print("Training selesai.")
    print("Leaderboard:")
    for row in result["leaderboard"]:
        print(
            f"- {row['model']}: "
            f"accuracy={row['accuracy']:.4f}, "
            f"precision_macro={row['precision_macro']:.4f}, "
            f"recall_macro={row['recall_macro']:.4f}, "
            f"f1_macro={row['f1_macro']:.4f}"
        )
    print(f"Best model : {result['best_model']}")
    print(f"Model file : {result['model_path']}")
    print(f"Metadata   : {result['metadata_path']}")
    print(f"MLflow     : {MLRUNS_DIR}")


if __name__ == "__main__":
    main()
