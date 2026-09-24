-- Run once in Supabase: SQL Editor > New query > paste > Run
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trade_date date not null,
  symbol text not null,
  side text not null check (side in ('long','short')),
  entry_price numeric,
  exit_price numeric,
  size numeric default 0,
  fees numeric default 0,
  pnl numeric not null,
  setup text,
  notes text,
  created_at timestamptz default now()
);
create index on public.trades (user_id, trade_date);
alter table public.trades enable row level security;
-- Each user can only see and change their own trades
create policy "own trades" on public.trades for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
