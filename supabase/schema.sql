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

-- Length caps: on top of Turnstile + the honeypot, this stops a submission
-- (bot or otherwise) from writing an oversized payload into any one field.
-- Applied by hand in the Supabase SQL editor on 2026-09-28; written here so
-- schema.sql stays the source of truth for a fresh project.
alter table public.leads drop constraint if exists leads_name_length;
alter table public.leads add constraint leads_name_length check (char_length(name) <= 200);
alter table public.leads drop constraint if exists leads_email_length;
alter table public.leads add constraint leads_email_length check (char_length(email) <= 254);
alter table public.leads drop constraint if exists leads_phone_length;
alter table public.leads add constraint leads_phone_length check (char_length(phone) <= 30);
alter table public.leads drop constraint if exists leads_brand_length;
alter table public.leads add constraint leads_brand_length check (char_length(brand) <= 200);
alter table public.leads drop constraint if exists leads_monthly_spend_length;
alter table public.leads add constraint leads_monthly_spend_length check (char_length(monthly_spend) <= 50);
alter table public.leads drop constraint if exists leads_message_length;
alter table public.leads add constraint leads_message_length check (message is null or char_length(message) <= 2000);
alter table public.leads drop constraint if exists leads_source_length;
alter table public.leads add constraint leads_source_length check (char_length(source) <= 100);
