-- Supabase table used by CarBecho's findings log.
-- Inferred from src/lib/inspector/store.ts (the repo has no migration file for it).
create table if not exists public.inspection_findings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  question    text not null,
  say         text not null,
  section     text not null,
  item        text not null,
  severity    text not null,
  action      text not null,
  lang        text not null,
  thumb       text,
  has_photo   boolean not null default false
);

alter table public.inspection_findings enable row level security;

-- Anyone can read; writes happen only via the service-role key (no insert policy on purpose).
create policy "findings are publicly readable"
  on public.inspection_findings for select using (true);
