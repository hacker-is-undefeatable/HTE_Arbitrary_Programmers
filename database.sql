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

-- Create profile automatically when a new user signs up (auth.users)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, learning_goal, preferred_explanation_style)
  values (
    new.id,
    'college',
    null,
    null,
    'step-by-step'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

-- 10. REVISION_TIME_LOGS TABLE
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

-- ========== QUIZ BATTLES (Quiz Party) ==========

-- quiz_servers: live quiz session instances
create table if not exists public.quiz_servers (
  id uuid default gen_random_uuid() primary key,
  invite_code char(6) not null,
  host_user_id uuid references public.profiles(id) on delete set null,
  lecture_session_id uuid references public.lecture_sessions(id) on delete set null,
  max_players integer not null check (max_players >= 2 and max_players <= 100),
  duration_minutes integer not null check (duration_minutes >= 5 and duration_minutes <= 120),
  status text not null default 'waiting' check (status in ('waiting', 'generating', 'active', 'ended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  current_question_index integer not null default 0,
  unique(invite_code)
);

create index if not exists idx_quiz_servers_invite_code on public.quiz_servers(invite_code);
create index if not exists idx_quiz_servers_status on public.quiz_servers(status);

-- quiz_participants: players in a quiz server (guests and logged-in)
create table if not exists public.quiz_participants (
  id uuid default gen_random_uuid() primary key,
  quiz_server_id uuid references public.quiz_servers(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  guest boolean not null default false,
  guest_tag_data_uri text,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  score integer not null default 0
);

create index if not exists idx_quiz_participants_quiz_server_id on public.quiz_participants(quiz_server_id);

-- quizzes: stored quiz (questions + metadata), linked to server and optionally saved for user
create table if not exists public.quizzes (
  id uuid default gen_random_uuid() primary key,
  quiz_server_id uuid references public.quiz_servers(id) on delete set null,
  host_user_id uuid references public.profiles(id) on delete set null,
  saved_for_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  question_count integer not null default 0,
  metadata jsonb
);

create index if not exists idx_quizzes_quiz_server_id on public.quizzes(quiz_server_id);
create index if not exists idx_quizzes_saved_for_user_id on public.quizzes(saved_for_user_id);

-- quiz_questions: individual questions with difficulty and source
create type quiz_question_difficulty as enum ('easy', 'medium', 'hard');

create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question_index integer not null,
  question_text text not null,
  choices jsonb not null,
  correct_choice_index integer not null check (correct_choice_index >= 0 and correct_choice_index <= 3),
  explanation text,
  difficulty quiz_question_difficulty not null,
  source_span text
);

create index if not exists idx_quiz_questions_quiz_id on public.quiz_questions(quiz_id);

-- quiz_downloads: track who downloaded (user or guest)
create table if not exists public.quiz_downloads (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  guest_display_name text,
  download_at timestamp with time zone default timezone('utc'::text, now()) not null,
  file_type text not null
);

create index if not exists idx_quiz_downloads_quiz_id on public.quiz_downloads(quiz_id);

-- quiz_answers: per-participant per-question answers for scoring
create table if not exists public.quiz_answers (
  id uuid default gen_random_uuid() primary key,
  quiz_server_id uuid references public.quiz_servers(id) on delete cascade not null,
  participant_id uuid references public.quiz_participants(id) on delete cascade not null,
  question_index integer not null,
  choice_index integer not null,
  correct boolean not null,
  answered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  time_ms integer
);

create index if not exists idx_quiz_answers_quiz_server_id on public.quiz_answers(quiz_server_id);
create index if not exists idx_quiz_answers_participant_id on public.quiz_answers(participant_id);
