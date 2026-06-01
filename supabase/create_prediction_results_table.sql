create table if not exists public.prediction_results (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  input_data jsonb not null,
  predicted_class_id integer not null,
  predicted_suitability_tier text not null,
  probabilities jsonb,
  created_at timestamptz not null default now()
);

alter table public.prediction_results
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.prediction_results enable row level security;

drop policy if exists "Users can read own prediction results"
on public.prediction_results;

create policy "Users can read own prediction results"
on public.prediction_results
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own prediction results"
on public.prediction_results;

create policy "Users can insert own prediction results"
on public.prediction_results
for insert
to authenticated
with check (auth.uid() = user_id);
