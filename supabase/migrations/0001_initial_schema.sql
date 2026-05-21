-- ============================================================
-- 0001 — Initial schema (existing tables)
-- ============================================================

-- Seller profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Products
create table public.products (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  slug text not null,
  description text,
  price integer not null, -- in paise
  file_key text not null,
  file_name text not null,
  cover_url text,
  is_published boolean default false,
  sales_count integer default 0,
  created_at timestamptz default now(),
  unique(seller_id, slug)
);

-- Orders
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) not null,
  buyer_email text not null,
  buyer_name text,
  amount integer not null, -- in paise (total paid by buyer)
  platform_fee integer not null default 0, -- in paise
  seller_earning integer not null default 0, -- in paise
  razorpay_order_id text unique,
  razorpay_payment_id text,
  status text default 'pending', -- pending | paid | failed
  download_token text unique,
  download_expires_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Profile policies
create policy "Public profiles viewable" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Product policies
create policy "Published products viewable" on public.products for select using (is_published = true);
create policy "Sellers view own products" on public.products for select using (auth.uid() = seller_id);
create policy "Sellers insert products" on public.products for insert with check (auth.uid() = seller_id);
create policy "Sellers update own products" on public.products for update using (auth.uid() = seller_id);
create policy "Sellers delete own products" on public.products for delete using (auth.uid() = seller_id);

-- Order policies
create policy "Sellers view orders for their products" on public.orders for select
  using (exists (select 1 from public.products where id = product_id and seller_id = auth.uid()));

-- Atomic sales count increment
create or replace function increment_sales_count(product_id uuid)
returns void language sql security definer as $$
  update public.products set sales_count = sales_count + 1 where id = product_id;
$$;