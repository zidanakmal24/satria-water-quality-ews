create table if not exists public.water_quality_clean (
  id bigserial primary key,
  temperature double precision,
  turbidity_cm double precision,
  dissolved_oxygen_mg_l double precision,
  biochemical_oxygen_demand_mg_l double precision,
  carbon_dioxide_co2 double precision,
  ph double precision,
  total_alkalinity_mg_l_1 double precision,
  total_hardness_mg_l_1 double precision,
  calcium_mg_l_1 double precision,
  ammonia_mg_l_1 double precision,
  nitrite_mg_l_1 double precision,
  phosphorus_mg_l_1 double precision,
  hydrogen_sulfide_mg_l_1 double precision,
  plankton_count_no_l_1 double precision,
  water_quality_label double precision,
  aquaculture_suitability_tier text,
  aquaculture_suitability_description text,
  created_at timestamptz not null default now()
);

alter table public.water_quality_clean enable row level security;

drop policy if exists "Authenticated users can read clean water quality data"
on public.water_quality_clean;

create policy "Authenticated users can read clean water quality data"
on public.water_quality_clean
for select
to authenticated
using (true);
