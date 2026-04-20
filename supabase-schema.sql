-- ============================================================
-- HOC VUI - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role in ('parent', 'student')),
  name text,
  avatar text default 'bear',
  created_at timestamptz default now()
);

-- ============================================================
-- CHILDREN
-- ============================================================
create table public.children (
  id uuid default uuid_generate_v4() primary key,
  parent_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  code text unique not null,
  avatar text default 'cat',
  grade int default 3,
  created_at timestamptz default now()
);

-- ============================================================
-- MESSAGES (realtime chat)
-- ============================================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  from_user uuid references public.users(id) on delete cascade,
  from_child uuid references public.children(id) on delete cascade,
  to_child uuid references public.children(id) on delete cascade,
  content text not null,
  type text default 'text' check (type in ('text', 'emoji', 'sticker')),
  created_at timestamptz default now()
);

-- ============================================================
-- QUIZ SETS
-- ============================================================
create table public.quiz_sets (
  id uuid default uuid_generate_v4() primary key,
  created_by uuid references public.users(id) on delete cascade not null,
  title text not null,
  subject text default 'math',
  grade int default 3,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- QUESTIONS
-- ============================================================
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quiz_sets(id) on delete cascade not null,
  question text not null,
  options jsonb not null, -- ["A", "B", "C", "D"]
  correct text not null,
  order_num int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- ROOMS (multiplayer quiz)
-- ============================================================
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  host_id uuid references public.users(id) on delete cascade,
  quiz_id uuid references public.quiz_sets(id) on delete set null,
  status text default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  current_question int default 0,
  started_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ROOM PLAYERS
-- ============================================================
create table public.room_players (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,
  display_name text not null,
  avatar text default 'cat',
  score int default 0,
  answers jsonb default '[]',
  joined_at timestamptz default now()
);

-- ============================================================
-- PROGRESS TRACKING
-- ============================================================
create table public.progress (
  id uuid default uuid_generate_v4() primary key,
  child_id uuid references public.children(id) on delete cascade not null,
  subject text not null,
  accuracy numeric default 0,
  streak int default 0,
  total_questions int default 0,
  correct_questions int default 0,
  xp int default 0,
  updated_at timestamptz default now()
);

-- ============================================================
-- QUIZ SESSIONS (individual practice)
-- ============================================================
create table public.quiz_sessions (
  id uuid default uuid_generate_v4() primary key,
  child_id uuid references public.children(id) on delete cascade not null,
  quiz_id uuid references public.quiz_sets(id) on delete cascade,
  subject text not null,
  score int default 0,
  total int default 0,
  answers jsonb default '[]',
  completed_at timestamptz default now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
alter table public.users enable row level security;
alter table public.children enable row level security;
alter table public.messages enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.questions enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_sessions enable row level security;

-- users: read own, insert own
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- children: parent owns
create policy "children_select" on public.children for select using (
  auth.uid() = parent_id or
  exists (select 1 from public.users where id = auth.uid() and role = 'student')
);
create policy "children_insert" on public.children for insert with check (auth.uid() = parent_id);
create policy "children_update" on public.children for update using (auth.uid() = parent_id);
create policy "children_delete" on public.children for delete using (auth.uid() = parent_id);

-- Allow read children by code (for student login) - use service role in API
create policy "children_select_by_code" on public.children for select using (true);

-- messages: participants
create policy "messages_select" on public.messages for select using (true);
create policy "messages_insert" on public.messages for insert with check (true);

-- quiz_sets
create policy "quiz_sets_select" on public.quiz_sets for select using (true);
create policy "quiz_sets_insert" on public.quiz_sets for insert with check (auth.uid() = created_by);
create policy "quiz_sets_update" on public.quiz_sets for update using (auth.uid() = created_by);
create policy "quiz_sets_delete" on public.quiz_sets for delete using (auth.uid() = created_by);

-- questions
create policy "questions_select" on public.questions for select using (true);
create policy "questions_insert" on public.questions for insert with check (
  exists (select 1 from public.quiz_sets where id = quiz_id and created_by = auth.uid())
);
create policy "questions_delete" on public.questions for delete using (
  exists (select 1 from public.quiz_sets where id = quiz_id and created_by = auth.uid())
);

-- rooms
create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert" on public.rooms for insert with check (true);
create policy "rooms_update" on public.rooms for update using (true);

-- room_players
create policy "room_players_select" on public.room_players for select using (true);
create policy "room_players_insert" on public.room_players for insert with check (true);
create policy "room_players_update" on public.room_players for update using (true);

-- progress
create policy "progress_select" on public.progress for select using (true);
create policy "progress_upsert" on public.progress for insert with check (true);
create policy "progress_update" on public.progress for update using (true);

-- quiz_sessions
create policy "sessions_select" on public.quiz_sessions for select using (true);
create policy "sessions_insert" on public.quiz_sessions for insert with check (true);

-- ============================================================
-- REALTIME (enable for these tables)
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;

-- ============================================================
-- SEED DATA (optional demo quiz)
-- ============================================================
-- You can insert demo questions after setup
