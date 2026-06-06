# SATRIA Water Quality EWS

SATRIA adalah aplikasi *Early Warning System* untuk klasifikasi kelayakan kualitas air akuakultur. Sistem ini dibangun dengan arsitektur **Microservices** yang menggabungkan model Machine Learning (dengan MLOps/MLflow), ekosistem backend terdistribusi (API Gateway, ML Service, Data Service) berbasis FastAPI, Supabase (Database & Auth terpusat), serta *dashboard* interaktif frontend React (Vite) untuk memantau metrik kualitas air, menjalankan prediksi EWS secara otomatis maupun manual, visualisasi analitik, *Exploratory Data Analysis* (EDA), dan merekam log prediksi waktu nyata.

## 🚀 Arsitektur Sistem (Microservices)

Project ini telah berevolusi dari arsitektur monolitik menjadi microservices untuk stabilitas, skalabilitas, dan kemudahan pengembangan (MLOps):

1. **API Gateway (`api-service` | Port: 8000)**  
   Titik masuk tunggal (single entry point) untuk aplikasi frontend. Bertugas memvalidasi JWT (menggunakan skema *asymmetric* modern Supabase) dan meneruskan rute (*routing*) ke ML Service atau Data Service.
2. **Machine Learning Service (`ml-service` | Port: 8001)**  
   Menangani inferensi model prediksi. Disertai dengan siklus MLOps (menggunakan MLflow Tracking) untuk pelatihan model, hyperparameter tuning, dan pengemasan model (`.pkl`) secara *baked offline* demi latensi inferensi 0ms.
3. **Data Service (`data-service` | Port: 8002)**  
   *Gatekeeper* yang berinteraksi langsung dengan database Supabase PostgreSQL. Berfungsi melayani operasi CRUD profil, mencatat riwayat prediksi, dan agregasi data *Exploratory Data Analysis* (EDA) dengan akses *service role* secara aman.
4. **Frontend Dashboard (`frontend` | Port: 5173)**  
   Antarmuka klien kaya fitur yang dibangun dengan React (Vite) + TypeScript. Menyajikan dashboard metrik real-time, grafik kualitas air, histori pengguna, dan keamanan otentikasi.

## Tech Stack

Frontend:
- Vite
- React & TypeScript
- Supabase JS Client
- Native HTML/CSS rendering
- SVG/CSS chart components

Backend:
- FastAPI & Uvicorn
- HTTPX (Internal Microservices Routing)
- Pydantic
- Pandas
- LightGBM & Scikit-learn
- MLflow (Tracking & Registry)

Database and Auth:
- Supabase Auth (ECC P-256)
- Supabase PostgreSQL
- Row Level Security policies
- Tables: `profiles`, `prediction_results`, `water_quality_clean`

Deployment:
- Vercel for frontend
- Docker / Docker Compose for full local stack
- `run.bat` local runner for quick initialization

## Main Features

- User login and register with Supabase Auth.
- Profile settings saved to Supabase `profiles`.
- Security and Privacy page for display name and password update.
- Manual prediction form using the trained backend model.
- Prediction logs saved to Supabase.
- Reports page with refresh and search.
- Analytics dashboard using Supabase EDA data.
- Nitrite, dissolved oxygen, pH, ammonia, phosphorus, and other parameter charts.
- EDA page with descriptive statistics, distribution chart, and outlier analysis.
- Deployment files for Vercel and Docker.

## Dataset

Dataset:
- Title: Refined Aquaculture Water Suitability Signals
- Theme: Aquaculture water suitability
- Shape: 4,300 rows and 17 columns
- Source: Kaggle

Core input parameters:
- Temperature
- Turbidity
- Dissolved Oxygen
- Biochemical Oxygen Demand
- Carbon Dioxide
- pH
- Total Alkalinity
- Total Hardness
- Calcium
- Ammonia
- Nitrite
- Phosphorus
- Hydrogen Sulfide
- Plankton Count

Prediction output:
- `predicted_class_id`
- `predicted_suitability_tier`
- probability per class

## Project Structure

```text
satria-water-quality-ews/
|-- frontend/                  # Source code UI/UX (React + Vite)
|
|-- services/                  # Microservices backend
|   |-- api-service/           # FastAPI Gateway (Port: 8000)
|   |-- ml-service/            # ML inference API & skrip MLOps training (Port: 8001)
|   `-- data-service/          # Operasi basis data Supabase (Port: 8002)
|
|-- models/                    # Dikelola secara otomatis oleh MLOps
|
|-- notebooks/
|   |-- eda_aquaculture.ipynb
|   |-- preprocessing_aquaculture.ipynb
|   |-- manual_mlops_pipeline.ipynb
|   `-- pycaret_aqua_water_suitability_.ipynb
|
|-- supabase/                  # Skrip SQL untuk setup database
|   |-- create_profiles_table.sql
|   |-- create_prediction_results_table.sql
|   |-- create_water_quality_clean_table.sql
|   `-- update_realtime_eda_and_prediction_policies.sql
|
|-- docs/
|   `-- DEPLOYMENT_CHECKLIST.md
|
|-- docker-compose.yml         # Orkestrasi container Docker
|-- run.bat                    # Skrip launcher interaktif (Docker & Native)
|-- vercel.json
|-- .env.example
|-- .dockerignore
`-- README.md
```

## Environment Variables

Root `.env` untuk backend dan `run.bat` launcher:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TABLE=water_quality_clean
SUPABASE_PREDICTION_TABLE=prediction_results
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> **Catatan Penting:** Skrip `run.bat` kami akan secara otomatis menyalin berkas `.env` ini ke dalam setiap folder *microservices* dan juga ke folder `frontend/.env` saat inisialisasi awal.

## Local Development (Microservices)

Cara paling mudah untuk menjalankan secara lokal adalah menggunakan `run.bat`:

```bash
.\run.bat
```

Anda dapat memilih:
1. **Docker**: `docker-compose up --build`
2. **Native**: Membuat venv, menginstall library Python & Node, lalu menjalankan kelima layanan (MLflow, ML-Service, Data-Service, API Gateway, dan Frontend) secara konkuren menggunakan `npx concurrently`.

Open:
- Frontend: `http://127.0.0.1:5173`
- API Gateway health: `http://127.0.0.1:8000/health`
- MLflow Dashboard: `http://127.0.0.1:5000`

Untuk manual run setiap service, baca `README.md` pada masing-masing folder komponen.

## Vercel Deployment

This repository includes `vercel.json`, so Vercel can deploy the frontend from the repository root.

Vercel settings:
- Install command: `cd frontend && npm ci`
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`

Required Vercel environment variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend-production-url
```

Note:
- Vercel deploys the frontend.
- Backend FastAPI microservices should be deployed separately to a backend host or run through Docker.
- After backend is deployed, update `VITE_API_BASE_URL` in Vercel.

## Supabase Setup

Run SQL files in this order from Supabase SQL editor:

1. `supabase/create_profiles_table.sql`
2. `supabase/create_prediction_results_table.sql`
3. `supabase/create_water_quality_clean_table.sql`
4. `supabase/update_realtime_eda_and_prediction_policies.sql`

If `water_quality_clean` is empty, you can populate it using the Data Service logic or Supabase UI.

## API Endpoints

API Gateway (Single Entry Point) base URL:

```text
http://127.0.0.1:8000
```

Endpoints (Gateway):
- `GET /health` checks backend availability and forwards to other microservices.
- `GET /model-info` returns model metadata (routed to ml-service).
- `POST /predict` predicts water quality (routed to ml-service & data-service).
- `GET /profiles/...`, `GET /eda/...` (routed to data-service).

Example prediction payload:

```json
{
  "data": {
    "temperature": 28,
    "turbidity_cm": 45,
    "dissolved_oxygen_mg_l": 6.8,
    "biochemical_oxygen_demand_mg_l": 3.2,
    "carbon_dioxide_co2": 8.4,
    "ph": 7.4,
    "total_alkalinity_mg_l_1": 120,
    "total_hardness_mg_l_1": 180,
    "calcium_mg_l_1": 70,
    "ammonia_mg_l_1": 0.05,
    "nitrite_mg_l_1": 0.02,
    "phosphorus_mg_l_1": 0.3,
    "hydrogen_sulfide_mg_l_1": 0.01,
    "plankton_count_no_l_1": 2500
  },
  "save_to_supabase": false
}
```

## Production Smoke Test

Before final submission or demo:

- Login/register user.
- Save profile in Settings.
- Update display name or password in Security and Privacy.
- Run Prediction.
- Check Reports and refresh logs.
- Open Analytics and verify Dissolved Oxygen, Nitrite, and Correlation visuals.
- Open EDA and verify Distribution and Outlier Analysis.
- Check API Gateway `/health`.
- Check Vercel env vars and Supabase RLS policies.

## Notes

More detailed deployment notes are available in:

```text
docs/DEPLOYMENT_CHECKLIST.md
```

Lihat juga `README.md` terpisah yang berada di setiap direktori (misalnya `frontend/README.md` atau `services/ml-service/README.md`).

## Authors

PBL Web Service, MLOps, and Data Mining  
Politeknik Elektronika Negeri Surabaya (PENS)
