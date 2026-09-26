-- Lead-capture table for mehbubsadik.online (written by /api/submit-lead.js).
--
-- Documentation only: an earlier version of this was already run by hand in
-- the Supabase SQL editor, so it may already be applied. Review before
-- re-running against the live project.

create table if not exists public.leads (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null,
  phone         text        not null,
  brand         text        not null,
  monthly_spend text        not null,
  message       text,
  source        text        not null default 'mehbubsadik.online',
  created_at    timestamptz not null default now()
);

alter table public.leads enable row level security;

-- The site's function uses the anon key: it may insert leads, nothing else.
-- No SELECT/UPDATE/DELETE policy exists, so anon can't read leads back.
drop policy if exists "anon can insert leads" on public.leads;
create policy "anon can insert leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- Needed because "automatically expose new tables" was left off when the
-- project was created, so anon has no table privileges by default.
grant insert on public.leads to anon;
