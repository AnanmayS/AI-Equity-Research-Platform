create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  stock_data_json jsonb not null,
  deep_dive_json jsonb not null,
  peer_comparison_json jsonb not null,
  bear_case_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  company_name text,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

create table if not exists public.stock_data_cache (
  cache_key text primary key,
  ticker text not null,
  peer_tickers text[] not null default '{}',
  data_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);
create index if not exists reports_user_ticker_created_idx on public.reports (user_id, ticker, created_at desc);
create index if not exists watchlists_user_created_idx on public.watchlists (user_id, created_at desc);
create index if not exists stock_data_cache_expires_idx on public.stock_data_cache (expires_at);
create index if not exists stock_data_cache_ticker_idx on public.stock_data_cache (ticker);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.reports enable row level security;
alter table public.watchlists enable row level security;
alter table public.stock_data_cache enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own watchlist" on public.watchlists;
create policy "Users can read own watchlist"
  on public.watchlists for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own watchlist" on public.watchlists;
create policy "Users can insert own watchlist"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own watchlist" on public.watchlists;
create policy "Users can update own watchlist"
  on public.watchlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own watchlist" on public.watchlists;
create policy "Users can delete own watchlist"
  on public.watchlists for delete
  using (auth.uid() = user_id);
