create extension if not exists "pgcrypto"; -- type: ignore

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic text not null,
  difficulty text not null,
  questions jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic text not null,
  score numeric not null,
  correct_answers integer not null,
  total_questions integer not null,
  difficulty text not null,
  feedback text not null,
  question_review jsonb not null,
  submitted_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.progress (
  user_id text primary key,
  accuracy numeric not null default 0,
  completed_quizzes integer not null default 0,
  current_difficulty text not null default 'easy',
  weak_topics jsonb not null default '[]'::jsonb,
  weekly_accuracy jsonb not null default '[]'::jsonb,
  topic_breakdown jsonb not null default '[]'::jsonb,
  recent_results jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
