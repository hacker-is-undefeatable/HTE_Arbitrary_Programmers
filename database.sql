-- DualPath AI Database Schema
-- This schema is designed for Supabase and uses PostgreSQL

-- 1. PROFILES TABLE (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  name text,
  role text not null check (role in ('high_school', 'college')),
  learning_goal text,
  preferred_explanation_style text default 'step-by-step' check (
    preferred_explanation_style in ('step-by-step', 'conceptual', 'visual')
  ),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- 2. MASTERY_SCORES TABLE
create table if not exists public.mastery_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null check (subject in ('math', 'python')),
  topic text not null,
  mastery_score integer not null default 50 check (mastery_score >= 0 and mastery_score <= 100),
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, subject, topic)
);

-- Index for faster queries
create index if not exists idx_mastery_scores_user_id on public.mastery_scores(user_id);
create index if not exists idx_mastery_scores_subject on public.mastery_scores(subject);

-- Enable RLS on mastery_scores
alter table public.mastery_scores enable row level security;

create policy "Users can view own mastery scores"
  on public.mastery_scores for select
  using ( auth.uid() = user_id );

create policy "Users can update own mastery scores"
  on public.mastery_scores for update
  using ( auth.uid() = user_id );

create policy "Users can insert own mastery scores"
  on public.mastery_scores for insert
  with check ( auth.uid() = user_id );

-- 3. QUIZ_ATTEMPTS TABLE
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null check (subject in ('math', 'python')),
  topic text not null,
  question text not null,
  user_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster queries
create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_timestamp on public.quiz_attempts(timestamp);
create index if not exists idx_quiz_attempts_subject_topic on public.quiz_attempts(subject, topic);

-- Enable RLS on quiz_attempts
alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select
  using ( auth.uid() = user_id );

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check ( auth.uid() = user_id );

-- 4. REVISION_SCHEDULE TABLE
create table if not exists public.revision_schedule (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null check (subject in ('math', 'python')),
  topic text not null,
  priority_score numeric(5, 2) not null default 0,
  next_revision_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, subject, topic)
);

-- Index for faster queries
create index if not exists idx_revision_schedule_user_id on public.revision_schedule(user_id);
create index if not exists idx_revision_schedule_next_date on public.revision_schedule(next_revision_date);

-- Enable RLS on revision_schedule
alter table public.revision_schedule enable row level security;

create policy "Users can view own revision schedule"
  on public.revision_schedule for select
  using ( auth.uid() = user_id );

create policy "Users can update own revision schedule"
  on public.revision_schedule for update
  using ( auth.uid() = user_id );

create policy "Users can insert own revision schedule"
  on public.revision_schedule for insert
  with check ( auth.uid() = user_id );

-- 5. DIAGNOSTIC_QUIZZES TABLE (to track if user completed diagnostic)
create table if not exists public.diagnostic_quizzes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null check (subject in ('math', 'python')),
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, subject)
);

-- Index for faster queries
create index if not exists idx_diagnostic_quizzes_user_id on public.diagnostic_quizzes(user_id);

-- Enable RLS
alter table public.diagnostic_quizzes enable row level security;

create policy "Users can view own diagnostic quizzes"
  on public.diagnostic_quizzes for select
  using ( auth.uid() = user_id );

create policy "Users can insert own diagnostic quizzes"
  on public.diagnostic_quizzes for insert
  with check ( auth.uid() = user_id );

-- 6. CODING_SUBMISSIONS TABLE (for Python coding tasks)
create table if not exists public.coding_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id text not null,
  code text not null,
  is_correct boolean,
  error_message text,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster queries
create index if not exists idx_coding_submissions_user_id on public.coding_submissions(user_id);
create index if not exists idx_coding_submissions_challenge_id on public.coding_submissions(challenge_id);

-- Enable RLS
alter table public.coding_submissions enable row level security;

create policy "Users can view own submissions"
  on public.coding_submissions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own submissions"
  on public.coding_submissions for insert
  with check ( auth.uid() = user_id );

-- Create index for common queries
create index if not exists idx_quiz_attempts_is_correct on public.quiz_attempts(is_correct);
