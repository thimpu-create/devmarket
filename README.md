# DevMarket — Indian Gumroad for Developers

Sell dev tools, templates, scripts, and boilerplates. Get paid via UPI. Built for India.

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **Supabase** — database, auth, row-level security
- **Razorpay** — UPI, cards, net banking payments
- **Cloudflare R2** — file storage with signed URLs (no AWS SDK — pure Node.js crypto)
- **Resend** — email delivery
- **Vercel** — hosting (free tier works)

**Zero paid dependencies.** Every service above has a free tier that covers the MVP.

---

## Setup in 5 steps

### 1. Clone and install
```bash
git clone <your-repo>
cd devmarket
npm install
cp .env.local.example .env.local
```

> No extra installs needed — AWS SDK has been removed. R2 presigned URLs are
> generated using Node's built-in `crypto` module.

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com) (free)
2. Go to **SQL Editor** → run the full contents of `supabase-schema.sql`
   - This creates the `profiles`, `products`, and `orders` tables
   - It also creates the `increment_sales_count` RPC function (required)
3. Go to **Project Settings → API** → copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 3. Set up Razorpay
1. Create account at [razorpay.com](https://razorpay.com) (free, ~2% per transaction)
2. Go to **Settings → API Keys → Generate Test Key** (use test mode first)
3. Add to `.env.local`:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same as KEY_ID — used client-side)

### 4. Set up Cloudflare R2
1. Create a [Cloudflare](https://cloudflare.com) account (free)
2. Go to **R2 → Create bucket** → name it `devmarket-files`
3. Go to **R2 → Manage R2 API Tokens → Create token** with Object Read & Write permissions
4. Add to `.env.local`:
   - `R2_ACCOUNT_ID` (your Cloudflare account ID, found in the right sidebar)
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME` → `devmarket-files`

### 5. Set up Resend
1. Create account at [resend.com](https://resend.com) (free — 3,000 emails/month)
2. Go to **Domains → Add domain** and verify your DNS records
3. Add to `.env.local`:
   - `RESEND_API_KEY`
4. Update the `from` field in `lib/email.ts` to match your verified domain

---

## Run locally
```bash
npm run dev
# visit http://localhost:3000
```

## Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Then go to **Vercel dashboard → your project → Settings → Environment Variables**
and add all the values from your `.env.local`.

---

## File structure
```
app/
  page.tsx                    # Landing page
  layout.tsx                  # Root layout
  globals.css                 # Global styles + design tokens
  dashboard/
    page.tsx                  # Seller dashboard (stats, products, sales)
    new-product/page.tsx      # Upload new product
  [username]/
    [product]/page.tsx        # Public product page + buy button
  api/
    create-order/route.ts     # Creates a Razorpay order
    verify-payment/route.ts   # Verifies payment signature + sends download email
    upload-url/route.ts       # Generates a presigned R2 upload URL
lib/
  supabase.ts                 # Supabase client (anon) + admin client (service role)
  razorpay.ts                 # Razorpay instance + signature verification + formatINR
  storage.ts                  # R2 presigned URLs using native Node.js crypto (no AWS SDK)
  email.ts                    # Resend email — sends download link to buyer
supabase-schema.sql           # Full DB schema — run this once in Supabase SQL editor
```

---

## Important notes from the fixes

### Product slugs
Products are matched by `slug` in the URL (e.g. `/johndoe/nextjs-saas-boilerplate`).
When inserting a product, generate a slug from the name:
```ts
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
```
Add this to your `products.insert()` call in `new-product/page.tsx`.

### Supabase RPC — increment_sales_count
The schema creates a Postgres function for atomically incrementing `sales_count`.
Make sure you ran `supabase-schema.sql` in full — the `verify-payment` API calls
`supabase.rpc('increment_sales_count', { product_id })` and will error without it.

### Replay attack protection
`verify-payment` only processes orders with `status = 'pending'`. A second call
with the same `razorpay_order_id` will return 404 — this is intentional.

---

## What's NOT in the MVP (build next)
- [ ] Login / signup pages (use Supabase Auth UI or build custom)
- [ ] Seller profile page (`/[username]`)
- [ ] Edit / delete product page
- [ ] Publish / unpublish toggle in dashboard
- [ ] Product cover image upload
- [ ] Razorpay webhook (server-side alternative to client-side verify — more reliable)
- [ ] GST invoices
- [ ] Payout tracking
- [ ] Explore / browse page

## Revenue model
Take 5% of every sale. With Razorpay at ~2%, your net cut is ~3% — and you own the platform.
