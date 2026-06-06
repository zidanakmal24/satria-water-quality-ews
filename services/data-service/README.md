# Data Service (Database Proxy)

## Peran
Servis ini bertindak sebagai *Database Access Layer* terisolasi. Frontend React tidak lagi menembak query langsung ke PostgreSQL Supabase demi alasan keamanan arsitektur. Data Service berada di belakang API Gateway dan berjalan di port **8002**.

## Tanggung Jawab
1. **Supabase Client:** Terhubung ke PostgreSQL Supabase menggunakan otorisasi tingkat admin (`SUPABASE_SERVICE_ROLE_KEY`) untuk menembus RLS (Row Level Security) guna komunikasi eksklusif antara sistem *backend-to-backend*.
2. **Pengelolaan Profil:** Membuat atau merombak (CRUD) profil pengguna dengan menyediakan *fallback* otomatis jika entitas pengguna hilang.
3. **Manajemen Log Prediksi:** Mencatat log hasil deteksi EWS model ML ke dalam tabel `prediction_results`.
4. **Agregasi EDA:** Memberikan jumlah dan cuplikan baris langsung dari dataset global bersih (`water_quality_clean`) tanpa membebani layanan machine learning.

## Cara Menjalankan Manual
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```
