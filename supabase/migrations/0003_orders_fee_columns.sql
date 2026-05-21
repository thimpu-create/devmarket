-- ============================================================
-- 0003 — Add platform_fee and seller_earning to orders
-- (these were missing from initial schema)
-- ============================================================

alter table public.orders
add column if not exists platform_fee integer not null default 0,
add column if not exists seller_earning integer not null default 0;

-- Backfill existing paid orders using current platform fee (5%)
update public.orders
set
  platform_fee = round(amount * 0.05),
  seller_earning = amount - round(amount * 0.05)
where status = 'paid'
  and platform_fee = 0;