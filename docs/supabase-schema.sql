-- Lumina cloud sync schema.
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Safe to re-run (idempotent).

-- ── Tables ────────────────────────────────────────────────────────────────
create table if not exists public.books (
  user_id        uuid not null references auth.users(id) on delete cascade,
  id             text not null,
  title          text not null,
  author         text,
  total_pages    int,
  current_page   int,
  last_read_date text,
  date_added     text,
  list_id        text,
  file_size      text,
  notes          jsonb default '[]'::jsonb,
  bookmarks      jsonb default '[]'::jsonb,
  rating         int,
  updated_at     timestamptz default now(),
  primary key (user_id, id)
);

create table if not exists public.lists (
  user_id   uuid not null references auth.users(id) on delete cascade,
  id        text not null,
  name      text not null,
  icon      text,
  color     text,
  is_system boolean default false,
  primary key (user_id, id)
);

create table if not exists public.streaks (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  current_streak int  default 0,
  longest_streak int  default 0,
  last_read_date text,
  history        jsonb default '[]'::jsonb,
  updated_at     timestamptz default now()
);

create table if not exists public.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  theme      text,
  updated_at timestamptz default now()
);

-- ── Row Level Security: each user can only see/modify their own rows ────────
alter table public.books    enable row level security;
alter table public.lists    enable row level security;
alter table public.streaks  enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own books"    on public.books;
drop policy if exists "own lists"    on public.lists;
drop policy if exists "own streaks"  on public.streaks;
drop policy if exists "own settings" on public.settings;

create policy "own books"    on public.books    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own lists"    on public.lists    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own streaks"  on public.streaks  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings" on public.settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: private bucket for PDF files ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('lumina-pdfs', 'lumina-pdfs', false)
on conflict (id) do nothing;

-- Users can only touch objects under their own  <user_id>/  folder.
drop policy if exists "own pdf read"   on storage.objects;
drop policy if exists "own pdf insert" on storage.objects;
drop policy if exists "own pdf update" on storage.objects;
drop policy if exists "own pdf delete" on storage.objects;

create policy "own pdf read"   on storage.objects for select
  using (bucket_id = 'lumina-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own pdf insert" on storage.objects for insert
  with check (bucket_id = 'lumina-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own pdf update" on storage.objects for update
  using (bucket_id = 'lumina-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own pdf delete" on storage.objects for delete
  using (bucket_id = 'lumina-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
