-- ScholarFly Database Schema
-- This schema is designed for Supabase and uses PostgreSQL

-- 1. PROFILES TABLE (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  name text,
  age integer check (age >= 5 and age <= 120),
  role text not null check (role in ('high_school', 'college')),
  learning_goal text,
  preferred_explanation_style text default 'step-by-step' check (
    preferred_explanation_style in ('step-by-step', 'conceptual', 'visual')
  ),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles
  add column if not exists age integer check (age >= 5 and age <= 120);

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
  attempt_id uuid default gen_random_uuid() not null,
  session_id uuid,
  total_questions integer check (total_questions >= 1),
  correct_count integer check (correct_count >= 0),
  quiz_source text default 'standard' check (quiz_source in ('standard', 'lecture-generated', 'adaptive')),
  question text not null,
  options jsonb,
  user_answer text not null,
  correct_answer text not null,
  explanation text,
  is_correct boolean not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quiz_attempts
  add column if not exists attempt_id uuid default gen_random_uuid() not null,
  add column if not exists session_id uuid,
  add column if not exists total_questions integer check (total_questions >= 1),
  add column if not exists correct_count integer check (correct_count >= 0),
  add column if not exists quiz_source text default 'standard' check (quiz_source in ('standard', 'lecture-generated', 'adaptive')),
  add column if not exists options jsonb,
  add column if not exists explanation text;

-- Index for faster queries
create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_timestamp on public.quiz_attempts(timestamp);
create index if not exists idx_quiz_attempts_subject_topic on public.quiz_attempts(subject, topic);
create index if not exists idx_quiz_attempts_attempt_id on public.quiz_attempts(attempt_id);
create index if not exists idx_quiz_attempts_session_id on public.quiz_attempts(session_id);

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

-- 7. LECTURE_SESSIONS TABLE (persistent Quick Create sessions)
create table if not exists public.lecture_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lecture_title text not null,
  media_url text,
  media_file_name text,
  media_mime_type text,
  notes_url text,
  notes_file_name text,
  notes_mime_type text,
  notes_text text,
  transcript text,
  summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lecture_sessions_user_id on public.lecture_sessions(user_id);
create index if not exists idx_lecture_sessions_created_at on public.lecture_sessions(created_at desc);

alter table public.lecture_sessions enable row level security;

create policy "Users can view own lecture sessions"
  on public.lecture_sessions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own lecture sessions"
  on public.lecture_sessions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own lecture sessions"
  on public.lecture_sessions for update
  using ( auth.uid() = user_id );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quiz_attempts_session_id_fkey'
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_session_id_fkey
      foreign key (session_id)
      references public.lecture_sessions(id)
      on delete set null;
  end if;
end $$;

-- 8. GENERATED_QUIZZES TABLE
create table if not exists public.generated_quizzes (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.lecture_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_generated_quizzes_session_id on public.generated_quizzes(session_id);
create index if not exists idx_generated_quizzes_user_id on public.generated_quizzes(user_id);

alter table public.generated_quizzes enable row level security;

create policy "Users can view own generated quizzes"
  on public.generated_quizzes for select
  using ( auth.uid() = user_id );

create policy "Users can insert own generated quizzes"
  on public.generated_quizzes for insert
  with check ( auth.uid() = user_id );

-- 9. GENERATED_FLASHCARDS TABLE
create table if not exists public.generated_flashcards (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.lecture_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  front text not null,
  back text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_generated_flashcards_session_id on public.generated_flashcards(session_id);
create index if not exists idx_generated_flashcards_user_id on public.generated_flashcards(user_id);

alter table public.generated_flashcards enable row level security;

create policy "Users can view own generated flashcards"
  on public.generated_flashcards for select
  using ( auth.uid() = user_id );

create policy "Users can insert own generated flashcards"
  on public.generated_flashcards for insert
  with check ( auth.uid() = user_id );

-- 10. FLIGHT_TICKETS TABLE
create table if not exists public.flight_tickets (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.lecture_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  checkpoints jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  completed_at timestamp with time zone,
  nft_badge_tx_hash text,
  nft_badge_token_id text,
  nft_badge_token_uri text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.flight_tickets
  add column if not exists completed boolean not null default false,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists nft_badge_tx_hash text,
  add column if not exists nft_badge_token_id text,
  add column if not exists nft_badge_token_uri text;

create index if not exists idx_flight_tickets_session_id on public.flight_tickets(session_id);
create index if not exists idx_flight_tickets_user_id on public.flight_tickets(user_id);
create index if not exists idx_flight_tickets_created_at on public.flight_tickets(created_at desc);

alter table public.flight_tickets enable row level security;

create policy "Users can view own flight tickets"
  on public.flight_tickets for select
  using ( auth.uid() = user_id );

create policy "Users can insert own flight tickets"
  on public.flight_tickets for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own flight tickets"
  on public.flight_tickets for update
  using ( auth.uid() = user_id );

-- 11. REVISION_TIME_LOGS TABLE
create table if not exists public.revision_time_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_revision_time_logs_user_id on public.revision_time_logs(user_id);
create index if not exists idx_revision_time_logs_started_at on public.revision_time_logs(started_at desc);

alter table public.revision_time_logs enable row level security;

create policy "Users can view own revision time logs"
  on public.revision_time_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert own revision time logs"
  on public.revision_time_logs for insert
  with check ( auth.uid() = user_id );
