# SATRIA

## Machine Learning-Based Early Warning System Development for Water Quality Classification to Mitigate Risks among Aquacultural Biotes

### PBL Web Service × MLOps × Data Mining

---

## Overview

SATRIA (Sistem Analisis dan Tracking Risiko Air) merupakan Early Warning System berbasis Machine Learning yang dikembangkan untuk membantu klasifikasi kualitas air budidaya perikanan serta mitigasi risiko terhadap biota akuakultur.

Sistem memanfaatkan data kualitas air, proses Data Mining, Machine Learning Classification, serta praktik MLOps menggunakan MLflow untuk menghasilkan prediksi kualitas air yang dapat digunakan sebagai dasar pengambilan keputusan dalam kegiatan akuakultur.

---

## Workflow

```text
1. Data Source (Kaggle Dataset)
            ↓
2. Data Collection
            ↓
3. Data Preprocessing
            ↓
4. Machine Learning Modelling
            ↓
5. MLflow Experiment Tracking
            ↓
6. Model Evaluation
            ↓
7. Best Model Selection
            ↓
8. Prediction System
            ↓
9. FastAPI Backend
            ↓
10. Frontend Website
            ↓
11. Deployment (Docker)
```

---

## Dataset Information

### Dataset

* Title : Refined Aquaculture Water Suitability Signals
* Author : Sandhya Palaniappan
* Source : Kaggle
* Theme : Aquaculture
* Shape : 4,300 Rows × 17 Columns
* Date : March 2026

Dataset Link:

https://www.kaggle.com/datasets/sandhyapalaniappan/refined-aquaculture-water-suitability-signals

---

## Features

### Physical Parameters

* Temperature
* Turbidity

### Chemical Parameters

* Dissolved Oxygen
* BOD
* CO₂
* pH
* Alkalinity
* Hardness
* Calcium
* Ammonia
* Nitrite
* Phosphorus
* Hydrogen Sulfide

### Biological Parameters

* Plankton Count

### Target Variables

* Water Quality Label
* Suitability Tier
* Suitability Description

---

## Technology Stack

### Machine Learning

* Scikit-Learn
* PyCaret
* Pandas
* NumPy

### MLOps

* MLflow

### Backend

* FastAPI
* Pydantic
* Uvicorn

### Frontend

* React

### Deployment

* Docker

---

## Project Structure

```text
satria-water-quality-ews/
│
├── data/
│   ├── raw/
│   └── processed/
│
├── notebooks/
│   └── eda.ipynb
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── model/
│   │   ├── train.py
│   │   ├── predict.py
│   │   ├── preprocessing.py
│   │   └── artifacts/
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── pages/
│       ├── components/
│       └── services/
│
├── mlflow/
│   └── mlruns/
│
├── docs/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Machine Learning Pipeline

### Data Collection

Mengambil dataset kualitas air akuakultur dari Kaggle.

### Data Preprocessing

* Data Cleaning
* Missing Value Handling
* Encoding
* Scaling
* Exploratory Data Analysis

### Model Training

Beberapa algoritma klasifikasi akan diuji untuk memperoleh model terbaik.

### Model Evaluation

Metrik evaluasi yang digunakan:

* Accuracy
* Precision
* Recall
* F1-Score
* Confusion Matrix

### MLflow Tracking

MLflow digunakan untuk:

* Experiment Tracking
* Parameter Logging
* Metrics Logging
* Model Registry

---

## Prediction System

Input:

* Temperature
* Turbidity
* Dissolved Oxygen
* BOD
* CO₂
* pH
* Alkalinity
* Hardness
* Calcium
* Ammonia
* Nitrite
* Phosphorus
* H₂S
* Plankton Count

Output:

* Water Quality Label
* Aquaculture Suitability Tier
* Risk Information

---

## Future Development

* Dashboard monitoring
* Early warning notification

---

## Authors

PBL Web Service × MLOps × Data Mining

Politeknik Elektronika Negeri Surabaya (PENS)
