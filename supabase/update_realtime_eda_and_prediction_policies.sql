alter table public.water_quality_clean enable row level security;

drop policy if exists "Authenticated users can read clean water quality data"
on public.water_quality_clean;

create policy "Authenticated users can read clean water quality data"
on public.water_quality_clean
for select
to authenticated
using (true);

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

drop policy if exists "Users can update own prediction results"
on public.prediction_results;

create policy "Users can update own prediction results"
on public.prediction_results
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
