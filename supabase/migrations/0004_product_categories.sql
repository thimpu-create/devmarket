-- ============================================================
-- 0004 — Add category and tech_stack to products
-- ============================================================

alter table public.products
add column if not exists category text default 'other',
add column if not exists tech_stack text[] default '{}';

-- Valid categories
-- 'react' | 'nextjs' | 'nodejs' | 'python' | 'devops' | 'ai' | 'cli' | 'template' | 'ebook' | 'other'