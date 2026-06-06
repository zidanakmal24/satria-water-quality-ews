# API Service (Gateway)

## Peran
Ini adalah **API Gateway** utama untuk sistem SATRIA. Semua request dari frontend React akan dikirim ke servis ini terlebih dahulu. Servis ini berjalan pada port **8000**.

## Tanggung Jawab
1. **Single Entry Point:** Melayani permintaan HTTP dari luar (CORS diaktifkan).
2. **Otentikasi (Auth):** Memeriksa header JWT (`Authorization: Bearer <token>`) menggunakan SDK `supabase.auth.get_user()` tanpa memerlukan JWT secret lokal, sehingga sangat aman.
3. **Routing & Orkestrasi:**
   - Permintaan `/predict` diteruskan ke `ml-service` (Port 8001), dan log hasil prediksi dikirimkan ke `data-service` (Port 8002).
   - Permintaan `/profiles`, `/logs`, dan `/eda` di-*bypass* ke `data-service`.

## Cara Menjalankan Manual
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
