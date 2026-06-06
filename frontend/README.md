# SATRIA Frontend (React + Vite)

## Peran
Sisi pengguna dari sistem (UI/UX) yang menghadirkan tampilan *dashboard* EWS modern untuk manajemen log prediksi, pengisian paramater kualitas air, serta analitik data interaktif. Dibuat menggunakan framework Vite (React + TypeScript). Berjalan pada port **5173**.

## Tanggung Jawab
1. **Autentikasi:** Mendaftarkan pengguna, otorisasi otentikasi login, serta menyimpan sesi secara otomatis via klien `@supabase/supabase-js`.
2. **User Interface Terpadu:** Sistem menu *single-page application* (SPA) interaktif lengkap dengan chart EDA berbasis HTML dan *responsive design* bernuansa biru (*Aquaculture aesthetics*).
3. **Integrasi Backend Tersentralisasi:** Semua interaksi data dan komputasi ML difokuskan melalui `VITE_API_BASE_URL` (API Gateway SATRIA di port `8000`). Supabase di frontend hanya dipakai untuk memicu siklus `onAuthStateChange`.

## Dependensi Environment
File `.env` harus berada di *root* `frontend/` (disalin secara otomatis oleh program peluncur `run.bat`).
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Cara Menjalankan Manual
```bash
npm install
npm run dev -- --port 5173
```

## Kompilasi Production (Build)
```bash
npm run build
```
File *build production* siap disajikan melalui folder `dist/` atau *platform hosting* otomatis seperti Vercel (dikonfigurasi pada `vercel.json` di proyek utama).
