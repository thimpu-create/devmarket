-- ============================================================
-- 0002 — Payout system + platform config
-- ============================================================

-- Platform config — change fees/settings from admin panel, no redeployment needed
create table public.platform_config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz default now()
);

-- Seed default config values
insert into public.platform_config (key, value, description) values
  ('platform_fee_percent', '5', 'Percentage fee taken from each sale (e.g. 5 = 5%)'),
  ('min_payout_amount', '10000', 'Minimum balance to trigger payout in paise (10000 = ₹100)'),
  ('payout_day', 'monday', 'Day of week for automatic payouts'),
  ('payouts_enabled', 'true', 'Master switch to enable/disable automatic payouts');

-- Seller bank account details (for payouts)
create table public.payout_accounts (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) on delete cascade unique not null,
  account_holder_name text not null,
  account_number text not null,
  ifsc_code text not null,
  bank_name text,
  razorpay_contact_id text, -- Razorpay Payouts contact ID
  razorpay_fund_account_id text, -- Razorpay Payouts fund account ID
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seller balance ledger — tracks every credit/debit
create table public.balance_transactions (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  order_id uuid references public.orders(id),
  payout_id uuid, -- filled when this credit is paid out
  type text not null, -- 'credit' (sale) | 'debit' (payout)
  amount integer not null, -- in paise, always positive
  description text,
  created_at timestamptz default now()
);

-- Payouts — one row per payout transfer to a seller
create table public.payouts (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) not null,
  amount integer not null, -- in paise
  status text default 'pending', -- pending | processing | paid | failed
  razorpay_payout_id text,
  razorpay_fund_account_id text,
  failure_reason text,
  requested_at timestamptz default now(),
  processed_at timestamptz,
  paid_at timestamptz
);

-- RLS
alter table public.platform_config enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.balance_transactions enable row level security;
alter table public.payouts enable row level security;

-- platform_config: only admins write, anyone can read
-- (admin check done server-side via service role key)
create policy "Platform config readable by all" on public.platform_config for select using (true);

-- payout_accounts: sellers manage their own
create policy "Sellers view own payout account" on public.payout_accounts for select using (auth.uid() = seller_id);
create policy "Sellers insert own payout account" on public.payout_accounts for insert with check (auth.uid() = seller_id);
create policy "Sellers update own payout account" on public.payout_accounts for update using (auth.uid() = seller_id);

-- balance_transactions: sellers see their own
create policy "Sellers view own balance" on public.balance_transactions for select using (auth.uid() = seller_id);

-- payouts: sellers see their own
create policy "Sellers view own payouts" on public.payouts for select using (auth.uid() = seller_id);

-- Function: get seller's current pending balance
create or replace function get_seller_balance(p_seller_id uuid)
returns integer language sql security definer as $$
  select coalesce(
    sum(case when type = 'credit' then amount else -amount end),
    0
  )::integer
  from public.balance_transactions
  where seller_id = p_seller_id
  and (payout_id is null or type = 'credit');
$$;