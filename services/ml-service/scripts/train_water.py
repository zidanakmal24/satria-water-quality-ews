from __future__ import annotations

import argparse
import json
import os
from typing import Dict, Any

import mlflow
import mlflow.sklearn
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    ConfusionMatrixDisplay,
)
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import RandomizedSearchCV, learning_curve

try:
    from lightgbm import LGBMClassifier
except ImportError:
    LGBMClassifier = None

from preprocessing import get_training_data, TARGET_COLUMN, RANDOM_STATE

MODEL_PREFERENCE = [
    "lightgbm",
    "random_forest",
    "gradient_boosting",
    "decision_tree",
    "logistic_regression",
    "baseline_dummy"
]


def configure_mlflow(experiment_name: str = "EWS_Model_Training") -> None:
    """Konfigurasi MLflow Tracking Server untuk Production MLOps."""
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)


def get_candidate_models() -> Dict[str, Pipeline]:
    """Mendefinisikan Pipeline Scikit-learn lengkap dengan SimpleImputer dan RobustScaler."""
    candidates = {
        "baseline_dummy": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            ("classifier", DummyClassifier(strategy="most_frequent", random_state=RANDOM_STATE)),
        ]),
        "decision_tree": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            ("classifier", DecisionTreeClassifier(
                max_depth=10, min_samples_leaf=5, class_weight="balanced", random_state=RANDOM_STATE
            )),
        ]),
        "logistic_regression": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            ("classifier", LogisticRegression(
                max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE
            )),
        ]),
        "random_forest": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            ("classifier", RandomForestClassifier(
                n_estimators=250, min_samples_leaf=2, class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1
            )),
        ]),
        "gradient_boosting": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            ("classifier", GradientBoostingClassifier(random_state=RANDOM_STATE)),
        ]),
    }

    if LGBMClassifier is not None:
        candidates["lightgbm"] = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            ("classifier", LGBMClassifier(
                objective="multiclass", n_estimators=300, learning_rate=0.05, num_leaves=31,
                class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1, verbose=-1
            )),
        ])

    return candidates


def evaluate_model(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
    """Menghitung metrik performa klasifikasi."""
    y_pred = model.predict(X_test)
    return {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision_macro": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y_test, y_pred, average="macro", zero_division=0),
        "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
    }


def train_and_log_models(test_size: float = 0.2) -> Dict[str, Any]:
    """Melatih semua kandidat dan meregistrasikan model terbaik ke MLflow Registry."""
    configure_mlflow()
    
    print("Memuat data...")
    X_train, X_test, y_train, y_test, features, classes, label_encoder = get_training_data(test_size)
    
    candidates = get_candidate_models()
    results = []

    # Induk eksperimen (Parent Run)
    with mlflow.start_run(run_name="Production_Training_Run"):
        mlflow.log_param("target_column", TARGET_COLUMN)
        mlflow.log_param("test_size", test_size)
        mlflow.log_param("random_state", RANDOM_STATE)
        mlflow.log_param("features", features)
        mlflow.log_metric("train_rows", X_train.shape[0])
        mlflow.log_metric("test_rows", X_test.shape[0])

        for name, pipeline in candidates.items():
            print(f"Melatih model: {name}...")
            # Anak eksperimen (Nested Run)
            with mlflow.start_run(run_name=name, nested=True):
                pipeline.fit(X_train, y_train)
                metrics = evaluate_model(pipeline, X_test, y_test)
                
                # Menyimpan parameter algoritma ML
                classifier = pipeline.named_steps["classifier"]
                mlflow.log_param("model_name", name)
                mlflow.log_params({
                    k: v for k, v in classifier.get_params().items()
                    if isinstance(v, (str, int, float, bool, type(None)))
                })
                mlflow.log_metrics(metrics)

                results.append({
                    "name": name,
                    "pipeline": pipeline,
                    "metrics": metrics
                })

        # Memilih model terbaik berdasarkan F1 dan Recall
        preference_rank = {name: index for index, name in enumerate(MODEL_PREFERENCE)}
        best = max(
            results,
            key=lambda item: (
                item["metrics"]["f1_macro"],
                item["metrics"]["recall_macro"],
                -preference_rank.get(item["name"], len(MODEL_PREFERENCE)),
            ),
        )

        best_name = best["name"]
        best_pipeline = best["pipeline"]

        # Search grid untuk hyperparameter tuning (Production-Ready)
        param_grids = {
            "lightgbm": {
                "classifier__n_estimators": [100, 200, 300, 400],
                "classifier__learning_rate": [0.01, 0.05, 0.1],
                "classifier__num_leaves": [15, 31, 63, 127],
                "classifier__max_depth": [3, 5, 8, 12],
                "classifier__min_child_samples": [20, 30, 50],
            },
            "random_forest": {
                "classifier__n_estimators": [100, 200, 300],
                "classifier__max_depth": [5, 10, 15, 20],
                "classifier__min_samples_split": [2, 5, 10, 20],
                "classifier__min_samples_leaf": [1, 2, 4, 10],
                "classifier__max_features": ["sqrt", "log2"],
            },
            "gradient_boosting": {
                "classifier__n_estimators": [50, 100, 200],
                "classifier__learning_rate": [0.01, 0.05, 0.1, 0.2],
                "classifier__max_depth": [3, 4, 5, 6],
                "classifier__subsample": [0.8, 0.9, 1.0],
            },
            "decision_tree": {
                "classifier__max_depth": [3, 5, 10, 15],
                "classifier__min_samples_split": [5, 10, 20, 50],
                "classifier__min_samples_leaf": [2, 5, 10, 20],
            },
            "logistic_regression": {
                "classifier__C": [0.001, 0.01, 0.1, 1.0, 10.0],
                "classifier__class_weight": ["balanced", None],
            }
        }

        final_pipeline = best_pipeline
        final_metrics = best["metrics"]
        is_tuned = False

        if best_name in param_grids:
            print(f"\nMelakukan Hyperparameter Tuning untuk model terbaik ({best_name})...")
            # Jalankan tuning dalam nested run khusus
            with mlflow.start_run(run_name=f"{best_name}_tuned", nested=True):
                search = RandomizedSearchCV(
                    estimator=best_pipeline,
                    param_distributions=param_grids[best_name],
                    n_iter=20,  # Ditingkatkan untuk pencarian yang lebih ekstensif
                    cv=3,
                    scoring="f1_macro",
                    random_state=RANDOM_STATE,
                    n_jobs=-1
                )
                search.fit(X_train, y_train)
                tuned_pipeline = search.best_estimator_
                tuned_metrics = evaluate_model(tuned_pipeline, X_test, y_test)
                
                print(f"Hyperparameters Terbaik: {search.best_params_}")
                print(f"Skor F1-Macro Tuned: {tuned_metrics['f1_macro']:.4f} (Baseline: {best['metrics']['f1_macro']:.4f})")
                
                mlflow.log_params(search.best_params_)
                mlflow.log_metrics(tuned_metrics)
                
                final_pipeline = tuned_pipeline
                final_metrics = tuned_metrics
                is_tuned = True
        else:
            print(f"\nModel terbaik ({best_name}) tidak memiliki parameter tuning. Melewati fase tuning.")

        print(f"\nModel akhir terpilih: {best_name} (Tuned: {is_tuned})")
        mlflow.log_param("best_model", best_name)
        mlflow.log_param("is_tuned", is_tuned)
        for m_name, m_val in final_metrics.items():
            mlflow.log_metric(f"best_{m_name}", m_val)

        # === ARTIFACT GENERATION ===
        print("Menghasilkan dan mengunggah grafik evaluasi ke MLflow...")
        
        # 1. Confusion Matrix
        cm_path = "confusion_matrix.png"
        fig, ax = plt.subplots(figsize=(8, 6))
        ConfusionMatrixDisplay.from_estimator(
            final_pipeline, X_test, y_test, display_labels=classes, cmap=plt.cm.Blues, ax=ax
        )
        plt.title(f"Confusion Matrix - {best_name} (Tuned: {is_tuned})")
        plt.savefig(cm_path, dpi=100, bbox_inches='tight')
        plt.close(fig)
        mlflow.log_artifact(cm_path)

        # 2. Classification Report Text
        y_pred = final_pipeline.predict(X_test)
        report_text = classification_report(y_test, y_pred, target_names=classes, zero_division=0)
        report_path = "classification_report.txt"
        with open(report_path, "w") as f:
            f.write(report_text)
        mlflow.log_artifact(report_path)

        # 3. Learning Curve
        print("Menghitung Learning Curve...")
        lc_path = "learning_curve.png"
        train_sizes, train_scores, test_scores = learning_curve(
            final_pipeline,
            X_train,
            y_train,
            cv=3,
            scoring="f1_macro",
            n_jobs=1,  # Set to 1 to avoid conflicts with model n_jobs
            train_sizes=np.linspace(0.1, 1.0, 5),
            random_state=RANDOM_STATE
        )
        
        train_scores_mean = np.mean(train_scores, axis=1)
        train_scores_std = np.std(train_scores, axis=1)
        test_scores_mean = np.mean(test_scores, axis=1)
        test_scores_std = np.std(test_scores, axis=1)
        
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.grid(True)
        ax.fill_between(
            train_sizes,
            train_scores_mean - train_scores_std,
            train_scores_mean + train_scores_std,
            alpha=0.1,
            color="r"
        )
        ax.fill_between(
            train_sizes,
            test_scores_mean - test_scores_std,
            test_scores_mean + test_scores_std,
            alpha=0.1,
            color="g"
        )
        ax.plot(
            train_sizes,
            train_scores_mean,
            'o-',
            color="r",
            label="Training score"
        )
        ax.plot(
            train_sizes,
            test_scores_mean,
            'o-',
            color="g",
            label="Cross-validation score"
        )
        ax.set_title(f"Learning Curve - {best_name}")
        ax.set_xlabel("Training examples")
        ax.set_ylabel("F1 Macro Score")
        ax.legend(loc="best")
        plt.savefig(lc_path, dpi=100, bbox_inches='tight')
        plt.close(fig)
        mlflow.log_artifact(lc_path)

        # Menyimpan metadata model (classes, features) sebagai JSON artifact
        metadata = {
            "classes": classes,
            "features": features,
            "target_column": TARGET_COLUMN,
        }
        metadata_path = "model_metadata.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=4)
        
        print("Menyimpan metadata model ke MLflow...")
        mlflow.log_artifact(metadata_path)

        # Meregistrasikan model ke MLflow Registry (Agar dapat ditarik oleh download_model.py)
        input_example = X_test.head(3)
        
        print("Menyimpan artefak Pipeline ke MLflow Registry...")
        mlflow.sklearn.log_model(
            sk_model=final_pipeline,
            artifact_path="best_pipeline",
            input_example=input_example,
            registered_model_name="EWS_Water_Quality_Classifier",
        )

        # Bersihkan file lokal sementara
        for temp_file in [cm_path, report_path, lc_path, metadata_path]:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

    # Leaderboard CLI output
    leaderboard = [
        {"model": item["name"], **item["metrics"]}
        for item in sorted(
            results,
            key=lambda i: (i["metrics"]["f1_macro"], i["metrics"]["recall_macro"]),
            reverse=True,
        )
    ]
    if is_tuned:
        leaderboard.insert(0, {"model": f"{best_name} (Tuned)", **final_metrics})
    
    return {
        "best_model": f"{best_name} (Tuned)" if is_tuned else best_name,
        "best_metrics": final_metrics,
        "leaderboard": leaderboard,
        "classes": classes,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Production ML Pipeline Training")
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    result = train_and_log_models(test_size=args.test_size)
    
    print("\n=== LEADERBOARD ===")
    for row in result["leaderboard"]:
        print(
            f"- {row['model']:<20}: "
            f"F1={row['f1_macro']:.4f} | "
            f"Recall={row['recall_macro']:.4f} | "
            f"Acc={row['accuracy']:.4f}"
        )
    print("===================\n")
    print(f"Daftar Kelas (Classes): {result['classes']}")
    print("Training MLOps selesai. Pipeline utuh telah didaftarkan ke MLflow Registry.")
