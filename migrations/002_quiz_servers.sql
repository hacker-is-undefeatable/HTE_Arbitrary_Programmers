-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Creates Quiz Party tables (quiz_servers, quiz_participants, quizzes, quiz_questions, quiz_downloads, quiz_answers).
-- Fixes: "Could not find the table 'public.quiz_servers' in the schema cache"

do $$
begin
  create type public.quiz_question_difficulty as enum ('easy', 'medium', 'hard');
exception
  when duplicate_object then null;
end
$$;

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
create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question_index integer not null,
  question_text text not null,
  choices jsonb not null,
  correct_choice_index integer not null check (correct_choice_index >= 0 and correct_choice_index <= 3),
  explanation text,
  difficulty public.quiz_question_difficulty not null,
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
