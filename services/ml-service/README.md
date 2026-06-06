# Machine Learning Service (MLOps)

## Peran
Service independen yang bertanggung jawab penuh terhadap **siklus Machine Learning**, mulai dari eksperimentasi (*training*) hingga fase inferensi (prediksi REST API). Servis ini berjalan pada port **8001**.

## Tanggung Jawab
1. **Model Inference:** Menyediakan endpoint internal `/predict` yang membaca artefak klasifikasi model `.pkl` (LightGBM) untuk menilai kualitas air berdasarkan 14 fitur parameter kimia. Prediksi ini bersifat *baked offline* sehingga latensi bernilai 0ms dan bebas dependensi jaringan.
2. **MLOps Pipeline:** Melalui folder `scripts/`, tersedia `train_water.py` yang melatih ulang data menggunakan *two-stage auto-tuning pipeline* lalu menyambungkan semua metrik, parameter, kurva performa (grafik `.png`), ke server MLflow lokal port 5000.

## Cara Menjalankan API Manual
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Menjalankan Ulang Training (Retraining)
Pastikan server MLflow sudah menyala, lalu:
```bash
python scripts/train_water.py
```
