-- ==========================================
-- DataFlow — Supabase Schema
-- Run this in Supabase SQL Editor
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── USERS ──
create table if not exists users (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  email             text unique not null,
  password_hash     text not null,
  plan              text not null default 'free' check (plan in ('free','pro','enterprise')),
  conversions_used  int not null default 0,
  conversions_limit int,                        -- null = unlimited
  company           text,
  phone             text,
  plan_expires_at   timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── TABLES ──
create table if not exists tables (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  cols        jsonb not null default '[]',
  rows        jsonb not null default '[]',
  rows_count  int not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── HISTORY ──
create table if not exists history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null,   -- 'text' | 'image' | 'pdf' | 'table'
  name        text not null,
  rows_count  int default 0,
  created_at  timestamptz default now()
);

-- ── PAYMENTS ──
create table if not exists payments (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references users(id) on delete cascade,
  moyasar_id   text unique not null,
  plan         text not null,
  amount       numeric not null,
  currency     text default 'SAR',
  status       text not null default 'pending',
  paid_at      timestamptz,
  created_at   timestamptz default now()
);

-- ── INDEXES ──
create index if not exists idx_tables_user    on tables(user_id);
create index if not exists idx_history_user   on history(user_id);
create index if not exists idx_payments_user  on payments(user_id);

-- ── RLS (Row Level Security) ──
alter table users    enable row level security;
alter table tables   enable row level security;
alter table history  enable row level security;
alter table payments enable row level security;

-- Users can only read/update their own row
create policy "users_self" on users
  for all using (auth.uid()::text = id::text);

-- Tables belong to user
create policy "tables_owner" on tables
  for all using (user_id = auth.uid());

-- History read-only for user
create policy "history_owner" on history
  for select using (user_id = auth.uid());

-- Payments read-only for user
create policy "payments_owner" on payments
  for select using (user_id = auth.uid());

-- ── AUTO updated_at ──
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_users_updated
  before update on users
  for each row execute function update_updated_at();

create trigger trg_tables_updated
  before update on tables
  for each row execute function update_updated_at();
