# SATRIA Water Quality Assessment Tool

SATRIA adalah sistem cerdas untuk klasifikasi kelayakan kualitas air akuakultur. Sistem ini dibangun dengan arsitektur **Microservices** yang modern, menggabungkan model Machine Learning (LightGBM), FastAPI backend, Supabase (Database & Auth), dan dashboard interaktif berbasis React (Vite).

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

## 🛠️ Tech Stack

**Frontend:** Vite, React, TypeScript, Supabase JS Client, CSS (Vanilla Custom Design)  
**Backend:** FastAPI, Uvicorn, HTTPX (untuk orkestrasi internal), Pydantic  
**Machine Learning:** LightGBM, Scikit-learn, Pandas, MLflow (Tracking & Registry)  
**Database & Auth:** Supabase Auth (ECC P-256), Supabase PostgreSQL, Row Level Security (RLS)  
**Deployment:** Docker, Docker Compose, `run.bat` (Local runner)

## 📁 Struktur Direktori Utama

* `frontend/` - Source code UI/UX (React + Vite)
* `services/`
  * `api-service/` - FastAPI Gateway
  * `ml-service/` - ML inference API & skrip MLOps training
  * `data-service/` - Operasi basis data Supabase
* `docker-compose.yml` - Orkestrasi container Docker
* `run.bat` - Skrip launcher interaktif (Docker & Native)
* `mlflow.db` - Database lokal untuk MLOps Tracking Server
* `docs/` - Dokumentasi deployment

## ⚙️ Variabel Lingkungan (.env)

Buat file `.env` di *root directory* repositori Anda dengan format berikut:

```env
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_TABLE=water_quality_clean
SUPABASE_PREDICTION_TABLE=prediction_results

VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> **Catatan Penting:** Skrip `run.bat` kami akan secara otomatis menyalin berkas `.env` ini ke dalam setiap folder *microservices* dan juga ke folder `frontend/.env` saat inisialisasi awal.

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini dilengkapi dengan `run.bat` *interactive launcher* yang mendukung 2 metode instalasi:

Jalankan perintah berikut di CMD/PowerShell Anda:
```bat
.\run.bat
```

Kemudian, pilih opsi yang diinginkan:
1. **[1] Menggunakan Docker (Direkomendasikan)**
   Membangun dan meluncurkan semua microservice di dalam *container* menggunakan Docker Compose. Sangat stabil dan terisolasi.
2. **[2] Berjalan Secara Lokal Native (Non-Docker)**
   Sistem akan secara otomatis membuat Virtual Environment Python, mengunduh semua depedensi (termasuk modul Node.js), dan meluncurkan semua lima servis (MLflow, 3 Backend Service, dan 1 Frontend) ke dalam satu terminal interaktif menggunakan `npx concurrently`. Tekan `Ctrl+C` kapan saja untuk mematikan semua layanan sekaligus.

Setelah skrip berjalan, aplikasi dapat diakses di:
* **Frontend:** `http://127.0.0.1:5173`
* **API Gateway:** `http://127.0.0.1:8000`
* **MLflow Tracking Dashboard:** `http://127.0.0.1:5000`

## 📊 MLOps (Machine Learning Operations)

Pelatihan ulang (*retraining*) model dapat dilakukan melalui skrip di dalam `services/ml-service`. Proses *training* telah menggunakan *pipeline* cerdas (*two-stage training* dengan hyperparameter tuning otomatis) dan seluruh riwayat eksperimen (akurasi, confusion matrix, metrik lainnya) akan tersimpan di MLflow Dashboard.

Untuk dokumentasi komponen yang lebih mendalam, kami menyarankan membaca `README.md` terpisah yang berada di setiap sub-direktori.

## 📝 Authors

PBL Web Service, MLOps, and Data Mining  
Politeknik Elektronika Negeri Surabaya (PENS)
