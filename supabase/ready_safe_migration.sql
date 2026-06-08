create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default '',
  organization text not null default '',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role text not null default '',
add column if not exists organization text not null default '',
add column if not exists bio text not null default '',
add column if not exists avatar_url text;

alter table public.profiles
alter column role set default '',
alter column organization set default '',
alter column bio set default '';

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile"
on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile"
on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, organization, bio)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', ''),
    coalesce(new.raw_user_meta_data ->> 'organization', ''),
    coalesce(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    organization = excluded.organization,
    bio = excluded.bio,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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

alter table public.water_quality_clean enable row level security;

drop policy if exists "Authenticated users can read clean water quality data"
on public.water_quality_clean;

create policy "Authenticated users can read clean water quality data"
on public.water_quality_clean
for select
to authenticated
using (true);
