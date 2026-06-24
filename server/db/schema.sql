create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password_hash text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists verse_ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  book_id integer not null,
  book_name text not null,
  chapter integer not null,
  verse integer not null,
  score integer not null check (score between 1 and 10),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.ratings') is not null then
    insert into verse_ratings (id, user_id, book_id, book_name, chapter, verse, score, favorite, created_at, updated_at)
    select id, user_id, book_id, book_name, chapter, verse, score, favorite, created_at, updated_at
    from ratings
    where scope = 'verse' and verse is not null
    on conflict do nothing;

    drop table ratings;
  end if;
end $$;

create index if not exists verse_ratings_reference_idx
  on verse_ratings (book_id, chapter, verse);

create index if not exists verse_ratings_updated_at_idx
  on verse_ratings (updated_at desc);

create unique index if not exists verse_ratings_one_per_user_idx
  on verse_ratings (user_id, book_id, chapter, verse);
