-- ============================================================
-- CodeNova — Emberwood Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: profiles
-- Extends Supabase auth.users with game data
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  username      text not null unique check (char_length(username) between 2 and 20),
  avatar_id     text not null check (avatar_id in ('avatar_ember', 'avatar_nova', 'avatar_lyra', 'avatar_sable')),
  xp            integer not null default 0 check (xp >= 0),
  level         integer not null default 1 check (level between 1 and 10),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_username on public.profiles(username);

-- ============================================================
-- TABLE: checkpoints
-- Designed for scalability: 1 seeded now, 7 + finale later
-- ============================================================

create table if not exists public.checkpoints (
  id                    uuid primary key default gen_random_uuid(),
  order_index           integer not null unique check (order_index between 1 and 8),
  title                 text not null,
  narrative_intro       text not null,
  narrative_success     text not null,
  narrative_failure     text not null,
  challenge_description text not null,
  starter_code          text not null,
  expected_output       text not null,
  test_input            text,              -- stdin for Judge0, nullable
  xp_reward             integer not null default 100 check (xp_reward > 0),
  is_active             boolean not null default false,  -- only active CPs are playable
  created_at            timestamptz not null default now()
);

-- Indexes
create index if not exists idx_checkpoints_order on public.checkpoints(order_index);
create index if not exists idx_checkpoints_active on public.checkpoints(is_active);

-- ============================================================
-- TABLE: user_progress
-- Tracks each player's state per checkpoint
-- ============================================================

create table if not exists public.user_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  checkpoint_id   uuid not null references public.checkpoints(id) on delete cascade,
  status          text not null default 'locked'
                    check (status in ('locked', 'unlocked', 'completed')),
  attempt_count   integer not null default 0 check (attempt_count >= 0),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Each user has exactly one progress record per checkpoint
  unique (user_id, checkpoint_id)
);

-- Indexes
create index if not exists idx_progress_user_id on public.user_progress(user_id);
create index if not exists idx_progress_checkpoint on public.user_progress(checkpoint_id);
create index if not exists idx_progress_status on public.user_progress(status);

-- ============================================================
-- TABLE: achievements
-- ============================================================

create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,       -- machine-readable key for backend logic
  title       text not null,
  description text not null,
  icon        text not null,              -- emoji or asset path
  xp_bonus    integer not null default 0 check (xp_bonus >= 0),
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_achievements_key on public.achievements(key);

-- ============================================================
-- TABLE: user_achievements
-- ============================================================

create table if not exists public.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  achievement_id  uuid not null references public.achievements(id) on delete cascade,
  unlocked_at     timestamptz not null default now(),

  unique (user_id, achievement_id)
);

-- Indexes
create index if not exists idx_user_achievements_user on public.user_achievements(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see/edit their own data
-- Service role key bypasses RLS (used by backend)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_achievements enable row level security;
alter table public.checkpoints enable row level security;
alter table public.achievements enable row level security;

-- Profiles: users can read/write own row only
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- User progress: own rows only
create policy "Users can view own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

-- User achievements: own rows only
create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

-- Checkpoints: readable by all authenticated users
create policy "Checkpoints are publicly readable"
  on public.checkpoints for select
  to authenticated
  using (true);

-- Achievements catalog: readable by all authenticated users
create policy "Achievement catalog is publicly readable"
  on public.achievements for select
  to authenticated
  using (true);

-- ============================================================
-- SEED DATA — VERTICAL SLICE
-- Checkpoint 1: "The Fractured Greeting Rune"
-- ============================================================

insert into public.checkpoints (
  order_index,
  title,
  narrative_intro,
  narrative_success,
  narrative_failure,
  challenge_description,
  starter_code,
  expected_output,
  test_input,
  xp_reward,
  is_active
) values (
  1,
  'The Fractured Greeting Rune',
  'You arrive at the first corrupted node of the Grid — a simple Greeting Rune that once welcomed travelers to Emberwood. The Corruption has twisted it into silence. A broken spell-construct hums before you, its output fractured. Restore the rune by writing a Python spell that greets the traveler by name. The Dragon Mother watches from the shadows of the ancient trees.',
  'The Greeting Rune flares with golden light! The traveler smiles as the restored rune speaks their name clearly. The Corruption retreats from this node. The Grid remembers you, young Architect. You have earned your first restoration seal.',
  'The rune splutters and dims. The Corruption laughs in the cracks between your logic. The traveler waits in silence. Do not despair — even the greatest Architects once stood where you stand now. Study the pattern. Try again.',
  'The Greeting Rune has been corrupted and no longer greets travelers properly. Your task is to restore it.

Write a Python function called greet(name) that:
- Takes a single string argument: the traveler''s name
- Returns a greeting string in this exact format: Hello, [name]!

Then call the function with the input provided and print the result.

Example:
  greet("Lyra") → prints "Hello, Lyra!"

The rune will be tested with the name "Ember". Your output must be exactly:
  Hello, Ember!',
  '# The Greeting Rune — restore it, Initiate
# Write your greet() function below

def greet(name):
    # TODO: return the correct greeting string
    pass

# Do not change the line below — it tests your spell
print(greet("Ember"))
',
  'Hello, Ember!',
  null,   -- no stdin needed (hardcoded in starter code)
  150,
  true    -- THIS IS THE ACTIVE CHECKPOINT
);

-- ============================================================
-- SEED DATA — Checkpoints 2-7 (locked, architecture stubs)
-- These will be fleshed out in future sprints
-- ============================================================

insert into public.checkpoints (order_index, title, narrative_intro, narrative_success, narrative_failure, challenge_description, starter_code, expected_output, xp_reward, is_active)
values
(2, 'The Loop Labyrinth', 'Coming soon...', 'Victory!', 'Try again.', 'Coming in Sprint 2.', '# Coming soon\n', '', 200, false),
(3, 'The Recursive Grove', 'Coming soon...', 'Victory!', 'Try again.', 'Coming in Sprint 3.', '# Coming soon\n', '', 250, false),
(4, 'The Sorting Stones', 'Coming soon...', 'Victory!', 'Try again.', 'Coming in Sprint 4.', '# Coming soon\n', '', 300, false),
(5, 'The Dict Dungeon', 'Coming soon...', 'Victory!', 'Try again.', 'Coming in Sprint 5.', '# Coming soon\n', '', 350, false),
(6, 'The Class Citadel', 'Coming soon...', 'Victory!', 'Try again.', 'Coming in Sprint 6.', '# Coming soon\n', '', 400, false),
(7, 'The Algorithm Abyss', 'Coming soon...', 'Victory!', 'Try again.', 'Coming in Sprint 7.', '# Coming soon\n', '', 500, false);

-- ============================================================
-- SEED DATA — Achievements
-- ============================================================

insert into public.achievements (key, title, description, icon, xp_bonus) values
(
  'spark_of_the_grid',
  'Spark of the Grid',
  'Completed your first Restoration Hunt. The Grid has felt your power.',
  '⚡',
  50
),
(
  'flawless_initiate',
  'Flawless Initiate',
  'Completed a Hunt on the very first attempt. The Dragon Mother bows her head.',
  '🌟',
  100
),
(
  'persistent_coder',
  'The Persistent Architect',
  'Submitted code 10 times — resilience is the mark of a true Architect.',
  '🔨',
  30
),
(
  'speed_rune',
  'Speed Rune',
  'Completed a Hunt in under 2 minutes.',
  '⚡',
  75
),
(
  'dragon_sigil',
  'Bearer of the Dragon Sigil',
  'Completed all Restoration Hunts. The Academy opens its gates to you.',
  '🐉',
  500
);