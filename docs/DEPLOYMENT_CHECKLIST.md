# SATRIA Deployment Checklist

## Status

- [x] Frontend production build works with `npm run build`.
- [x] Vercel root config exists in `vercel.json`.
- [x] SPA rewrite is configured for direct page refresh.
- [x] Frontend env examples include Supabase and API base URL.
- [x] Backend Dockerfile is available for FastAPI + model artifacts.
- [x] Frontend Dockerfile is available for static nginx hosting.
- [x] Docker Compose runs frontend and backend together.
- [x] Supabase SQL migrations are present for profiles, prediction logs, EDA table, and RLS policies.
- [ ] Apply Supabase migrations in the Supabase SQL editor.
- [ ] Add production env vars in Vercel.
- [ ] Deploy backend to a backend host if Vercel only hosts the frontend.
- [ ] Set `VITE_API_BASE_URL` in Vercel to the deployed backend URL.
- [ ] Run a final prediction, profile save, reports refresh, analytics, and EDA smoke test in production.

## Required Environment Variables

### Frontend / Vercel

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend-domain.example.com
```

For local frontend development, `VITE_API_BASE_URL` can stay as:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Backend

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TABLE=water_quality_clean
SUPABASE_PREDICTION_TABLE=prediction_results
```

## Vercel Frontend Deploy

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Keep the root directory as the repository root.
4. Vercel will use `vercel.json`:
   - Install: `cd frontend && npm ci`
   - Build: `cd frontend && npm run build`
   - Output: `frontend/dist`
5. Add the frontend env vars in Vercel Project Settings.
6. Deploy.

## Docker Local Run

1. Copy `.env.example` to `.env`.
2. Fill Supabase values and Vite values in `.env`.
3. Make sure `.env` also contains the frontend variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

4. Run:

```bash
docker compose up --build
```

If your Docker installation uses the legacy Compose command, run:

```bash
docker-compose up --build
```

5. Open:
   - Frontend: `http://127.0.0.1:5173`
   - Backend health: `http://127.0.0.1:8000/health`
   - Backend docs: `http://127.0.0.1:8000/docs`

## Supabase SQL Order

Run these files in Supabase SQL editor:

1. `supabase/create_profiles_table.sql`
2. `supabase/create_prediction_results_table.sql`
3. `supabase/create_water_quality_clean_table.sql`
4. `supabase/update_realtime_eda_and_prediction_policies.sql`
5. Upload/refresh dataset using `backend/model/upload_clean_dataset_to_supabase.py` if the table is empty.

## Production Smoke Test

- [ ] Register/login user.
- [ ] Save profile in Settings.
- [ ] Update username/password in Security & Privacy.
- [ ] Run Prediction and confirm result is stored in Reports.
- [ ] Click Refresh Logs in Reports.
- [ ] Open Analytics and verify Dissolved Oxygen, Nitrite, and Correlation visuals.
- [ ] Open EDA and verify Distribution + Outlier Analysis visuals.
