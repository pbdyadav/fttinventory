-- Production-safe migration: nullable columns only, idempotent.
-- Run in Supabase SQL Editor before or with app deploy.

alter table public.sales
  add column if not exists partial_dp_cash_amount numeric(12,2),
  add column if not exists partial_dp_online_amount numeric(12,2),
  add column if not exists payment_narration text;
