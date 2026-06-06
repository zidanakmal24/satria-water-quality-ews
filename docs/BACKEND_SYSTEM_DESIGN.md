# SATRIA Water Quality EWS - Backend System Design

**Version:** 1.0
**Author:** AI System Architect / MLOps Engineer
**Date:** June 2026

---

## 1. Executive Summary

Dokumen ini mendeskripsikan arsitektur final untuk sistem backend aplikasi **SATRIA Water Quality Early Warning System (EWS)**. Menyadari kebutuhan akan skalabilitas, pemisahan beban kerja yang jelas (CPU vs I/O), serta integrasi *Machine Learning Operations* (MLOps) yang solid, sistem ini dirancang menggunakan arsitektur **3-Tier Microservices** berbasis **FastAPI**.

Pendekatan ini memusatkan seluruh orkestrasi pada satu *API Gateway*, mengamankan transaksi *database* dari eksploitasi pihak klien (*frontend*), dan menjamin latensi inferensi serendah mungkin menggunakan metode *Baked Offline Model*.

---

## 2. High-Level Architecture

Arsitektur terdiri dari tiga layanan mandiri (*microservices*) dan satu lapisan data (*Supabase*):

1.  **`api-service` (API Gateway & Orchestrator)**: Satu-satunya pintu masuk bagi Frontend. Berfungsi mengamankan dan merutekan HTTP request ke layanan di belakangnya.
2.  **`ml-service` (Inference Engine)**: Layanan terisolasi yang khusus bertugas memproses input parameter ke dalam model Machine Learning dan mengembalikan hasil prediksi.
3.  **`data-service` (Data Access Layer)**: Layanan terisolasi yang berinteraksi langsung dengan Database PostgreSQL (Supabase) untuk operasi *Create, Read, Update, Delete* (CRUD).
4.  **Supabase PostgreSQL**: Bertindak sebagai sumber kebenaran data (*Single Source of Truth*) untuk profil pengguna dan log prediksi.

### Data Flow Diagram (Sederhana)
```text
[Frontend / Client] 
        │
      (HTTP) 
        ▼
┌──────────────────┐       (Internal HTTP)      ┌──────────────────┐
│   api-service    │───────────────────────────▶│    ml-service    │
│ (Gateway & Auth) │                            │ (LightGBM Model) │
└──────────────────┘                            └──────────────────┘
        │
      (Internal HTTP)
        ▼
┌──────────────────┐       (SQL/HTTP)           ┌──────────────────┐
│   data-service   │───────────────────────────▶│     Supabase     │
│ (Database CRUD)  │                            │   (PostgreSQL)   │
└──────────────────┘                            └──────────────────┘
```

---

## 3. Microservices Breakdown

### A. API Service (`api-service`)
Sebagai *Orchestrator*, layanan ini tidak memiliki koneksi langsung ke *Database* maupun model Machine Learning. Tugasnya adalah merangkai alur bisnis.
*   **Keamanan (Security):** Semua *request* diverifikasi menggunakan `security.py` untuk memvalidasi *Signature* JWT Supabase. Jika *token* tidak valid, *request* ditolak di pintu masuk (401 Unauthorized).
*   **Routing:** Memetakan kebutuhan spesifik *Frontend* ke operasi internal.
*   **Klien Internal:** Menggunakan `httpx` (di dalam `services/ml_client.py` dan `data_client.py`) untuk memanggil `ml-service` atau `data-service` secara *asynchronous* tanpa memblokir *event loop*.

### B. ML Service (`ml-service`)
Dibangun secara efisien untuk beban komputasi CPU intensif.
*   **Isolasi Logika:** Hanya menerima format `schemas/water_schema.py`. Tidak membutuhkan ID Pengguna atau Token JWT karena data anonim dari sudut pandang *Machine Learning*.
*   **In-Memory Load:** Menggunakan Joblib/Cloudpickle untuk memuat file `.pkl` ke RAM (Random Access Memory) pada saat aplikasi dihidupkan (Startup Event FastAPI), memastikan *latency* inferensi di bawah hitungan milidetik.

### C. Data Service (`data-service`)
Sebagai *Database Access Layer*, menyembunyikan kredensial *database* dari layanan lain.
*   **Operasi Aman:** Menghentikan praktik buruk dimana Frontend menembak *database* secara langsung.
*   **Sentralisasi Kueri:** Semua operasi pengambilan data EDA, pembuatan Log Prediksi, dan agregasi data *Analytics* ditulis secara rapi di `app/db/queries.py` menggunakan Klien Python Supabase atau `asyncpg`.

---

## 4. Frontend Domain Alignment (Routes Mapping)

Dokumen *Blueprint Frontend* mensyaratkan 6 "Service Boundaries". Pada sistem *backend* ini, ke-6 batas domain tersebut diimplementasikan secara elegan sebagai **Route Groups** di dalam `api-service`, *bukan* sebagai microservices yang dipisah secara fisik:

| Domain (Frontend) | Implementasi Backend (`api-service/app/routes/`) | Orkestrasi Downstream |
| :--- | :--- | :--- |
| **Auth** | `auth.py` | Validasi Token via Supabase Auth API |
| **Profile** | `profile.py` | Memanggil `data-service` (GET/PUT `/internal/profile`) |
| **Prediction** | `predict.py` | Meneruskan data ke `ml-service`, lalu hasil log dikirim ke `data-service` |
| **Analytics** | `analytics.py` | Memanggil `data-service` (GET `/internal/analytics/{user_id}`) |
| **EDA** | `eda.py` | Memanggil `data-service` (GET `/internal/eda-stats`) |
| **Reporting** | `reports.py` | Memanggil `data-service` untuk riwayat log dan agregasi CSV |

---

## 5. Praktik MLOps: "Baked Offline" & MLflow

Untuk mengelola siklus hidup model Machine Learning yang terus berkembang seiring masuknya data tambak yang baru, sistem ini menganut metode **Baked Offline Deployment**.

1.  **Fase Eksperimen (Tracking Server):** 
    Selama proses pelatihan di `notebooks/training_mlflow.ipynb`, ilmuwan data (Data Scientist) akan merekam parameter (hyperparameters), metrik evaluasi (Akurasi, F1, Loss), dan menyimpan model (Artefak) ke server lokal **MLflow** (berjalan via Docker).
2.  **Model Registry:**
    Model terbaik akan diberi status **"Production"** di dalam MLflow Model Registry.
3.  **Baking (Download Model):**
    Saat menyiapkan/melakukan *build* untuk *container* `ml-service`, *script* `scripts/download_model.py` dijalankan secara otomatis. *Script* ini menghubungi API MLflow, mengambil artefak `.pkl` berstatus "Production", lalu menaruhnya (mem-*bake*) ke dalam direktori `/app/domains/water/artifacts/`.
4.  **Production Runtime:**
    Ketika kontainer `ml-service` hidup (*running*), ia hanya membaca file `.pkl` dari disk internal (direktori lokal kontainer). **Tidak ada pemanggilan jaringan (*network calls*) sama sekali ke server MLflow saat user melakukan prediksi**.

**Keunggulan Metode MLOps Ini:**
*   Sangat cepat (Latency nol untuk *model fetching*).
*   Anti-Runtuh: Walaupun MLflow mati, API Prediksi (`ml-service`) tetap beroperasi normal.

---

## 6. Struktur Direktori Utama

Pemisahan tanggung jawab diwujudkan melalui penataan repositori berikut:

```text
satria-water-quality-ews/
├── services/
│   │
│   ├── api-service/              # API Gateway Utama
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── routes/           # auth.py, profile.py, predict.py, dll.
│   │   │   ├── schemas/
│   │   │   ├── services/         # HTTP Clients internal (ke ml-service & data-service)
│   │   │   └── core/             # Konfigurasi & JWT Verifier
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── ml-service/               # Inference Engine AI
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   └── domains/water/
│   │   │       ├── predict.py
│   │   │       └── artifacts/    # water_quality_pipeline.pkl (Offline Bake)
│   │   ├── scripts/
│   │   │   ├── train_water.py
│   │   │   └── download_model.py # Script menarik model dari MLflow Registry
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── data-service/             # Database Access Layer
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── db/               # Supabase Connection
│   │   │   ├── routes/           # Internal endpoint CRUD
│   │   │   └── schemas/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│
├── docker-compose.yml            # Skrip Orkestrasi: gateway, ml, data, & mlflow
└── notebooks/                    # Fase Riset, Training, & Eksperimen MLOps
```

---
*Dokumen ini merupakan pedoman baku untuk pembangunan sistem perangkat lunak backend SATRIA Water Quality EWS.*
