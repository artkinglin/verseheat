create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password_hash text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  scope text not null check (scope in ('verse', 'chapter')),
  book_id integer not null,
  book_name text not null,
  chapter integer not null,
  verse integer,
  score integer not null check (score between 1 and 10),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope, book_id, chapter, verse)
);

create index if not exists ratings_reference_idx
  on ratings (scope, book_id, chapter, verse);

create index if not exists ratings_updated_at_idx
  on ratings (updated_at desc);
