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

create table if not exists collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collections_user_updated_at_idx
  on collections (user_id, updated_at desc);

create unique index if not exists collections_one_name_per_user_idx
  on collections (user_id, lower(name));

create table if not exists collection_verses (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references collections(id) on delete cascade,
  book_id integer not null,
  book_name text not null,
  chapter integer not null,
  verse integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists collection_verses_one_reference_idx
  on collection_verses (collection_id, book_id, chapter, verse);

create index if not exists collection_verses_reference_idx
  on collection_verses (book_id, chapter, verse);

create table if not exists verse_struggles (
  book_id integer not null,
  book_name text not null,
  chapter integer not null,
  verse integer not null,
  category text not null,
  struggle text not null,
  created_at timestamptz not null default now(),
  primary key (book_id, chapter, verse, struggle)
);

create index if not exists verse_struggles_struggle_idx
  on verse_struggles (struggle);

insert into verse_struggles (book_id, book_name, chapter, verse, category, struggle)
values
  (40, 'Matthew', 5, 28, '7 Deadly Sins', 'Lust'),
  (46, '1 Corinthians', 6, 18, '7 Deadly Sins', 'Lust'),
  (52, '1 Thessalonians', 4, 3, '7 Deadly Sins', 'Lust'),
  (55, '2 Timothy', 2, 22, '7 Deadly Sins', 'Lust'),
  (20, 'Proverbs', 16, 18, '7 Deadly Sins', 'Pride'),
  (59, 'James', 4, 6, '7 Deadly Sins', 'Pride'),
  (50, 'Philippians', 2, 3, '7 Deadly Sins', 'Pride'),
  (60, '1 Peter', 5, 5, '7 Deadly Sins', 'Pride'),
  (42, 'Luke', 12, 15, '7 Deadly Sins', 'Greed'),
  (54, '1 Timothy', 6, 10, '7 Deadly Sins', 'Greed'),
  (58, 'Hebrews', 13, 5, '7 Deadly Sins', 'Greed'),
  (40, 'Matthew', 6, 24, '7 Deadly Sins', 'Greed'),
  (59, 'James', 1, 19, '7 Deadly Sins', 'Wrath'),
  (59, 'James', 1, 20, '7 Deadly Sins', 'Wrath'),
  (49, 'Ephesians', 4, 26, '7 Deadly Sins', 'Wrath'),
  (20, 'Proverbs', 15, 1, '7 Deadly Sins', 'Wrath'),
  (45, 'Romans', 12, 19, '7 Deadly Sins', 'Wrath'),
  (20, 'Proverbs', 23, 20, '7 Deadly Sins', 'Gluttony'),
  (20, 'Proverbs', 23, 21, '7 Deadly Sins', 'Gluttony'),
  (46, '1 Corinthians', 10, 31, '7 Deadly Sins', 'Gluttony'),
  (50, 'Philippians', 3, 19, '7 Deadly Sins', 'Gluttony'),
  (20, 'Proverbs', 25, 16, '7 Deadly Sins', 'Gluttony'),
  (48, 'Galatians', 5, 26, '7 Deadly Sins', 'Envy'),
  (59, 'James', 3, 16, '7 Deadly Sins', 'Envy'),
  (20, 'Proverbs', 14, 30, '7 Deadly Sins', 'Envy'),
  (46, '1 Corinthians', 13, 4, '7 Deadly Sins', 'Envy'),
  (20, 'Proverbs', 6, 6, '7 Deadly Sins', 'Sloth'),
  (20, 'Proverbs', 13, 4, '7 Deadly Sins', 'Sloth'),
  (51, 'Colossians', 3, 23, '7 Deadly Sins', 'Sloth'),
  (53, '2 Thessalonians', 3, 10, '7 Deadly Sins', 'Sloth'),
  (19, 'Psalms', 63, 1, 'Spiritual', 'Seeking intimacy with God'),
  (59, 'James', 4, 8, 'Spiritual', 'Seeking intimacy with God'),
  (43, 'John', 15, 4, 'Spiritual', 'Seeking intimacy with God'),
  (24, 'Jeremiah', 29, 13, 'Spiritual', 'Seeking intimacy with God'),
  (45, 'Romans', 10, 17, 'Spiritual', 'Building faith'),
  (58, 'Hebrews', 11, 1, 'Spiritual', 'Building faith'),
  (41, 'Mark', 9, 24, 'Spiritual', 'Building faith'),
  (42, 'Luke', 17, 5, 'Spiritual', 'Building faith'),
  (43, 'John', 14, 27, 'Spiritual', 'Finding peace'),
  (50, 'Philippians', 4, 6, 'Spiritual', 'Finding peace'),
  (50, 'Philippians', 4, 7, 'Spiritual', 'Finding peace'),
  (23, 'Isaiah', 26, 3, 'Spiritual', 'Finding peace'),
  (51, 'Colossians', 3, 15, 'Spiritual', 'Finding peace'),
  (59, 'James', 1, 6, 'Spiritual', 'Dealing with doubt'),
  (65, 'Jude', 1, 22, 'Spiritual', 'Dealing with doubt'),
  (40, 'Matthew', 14, 31, 'Spiritual', 'Dealing with doubt'),
  (43, 'John', 20, 27, 'Spiritual', 'Dealing with doubt'),
  (50, 'Philippians', 4, 6, 'Life issues', 'Anxiety'),
  (50, 'Philippians', 4, 7, 'Life issues', 'Anxiety'),
  (60, '1 Peter', 5, 7, 'Life issues', 'Anxiety'),
  (40, 'Matthew', 6, 34, 'Life issues', 'Anxiety'),
  (19, 'Psalms', 94, 19, 'Life issues', 'Anxiety'),
  (40, 'Matthew', 5, 4, 'Life issues', 'Grief'),
  (19, 'Psalms', 34, 18, 'Life issues', 'Grief'),
  (66, 'Revelation', 21, 4, 'Life issues', 'Grief'),
  (43, 'John', 11, 35, 'Life issues', 'Grief'),
  (49, 'Ephesians', 4, 32, 'Life issues', 'Forgiveness'),
  (51, 'Colossians', 3, 13, 'Life issues', 'Forgiveness'),
  (40, 'Matthew', 6, 14, 'Life issues', 'Forgiveness'),
  (62, '1 John', 1, 9, 'Life issues', 'Forgiveness'),
  (49, 'Ephesians', 4, 31, 'Life issues', 'Anger'),
  (20, 'Proverbs', 15, 1, 'Life issues', 'Anger'),
  (21, 'Ecclesiastes', 7, 9, 'Life issues', 'Anger'),
  (19, 'Psalms', 37, 8, 'Life issues', 'Anger'),
  (18, 'Job', 1, 21, 'Life issues', 'Loss'),
  (19, 'Psalms', 73, 26, 'Life issues', 'Loss'),
  (47, '2 Corinthians', 1, 3, 'Life issues', 'Loss'),
  (47, '2 Corinthians', 1, 4, 'Life issues', 'Loss'),
  (50, 'Philippians', 3, 8, 'Life issues', 'Loss'),
  (19, 'Psalms', 23, 4, 'Common struggles', 'Comfort'),
  (23, 'Isaiah', 41, 10, 'Common struggles', 'Comfort'),
  (47, '2 Corinthians', 1, 5, 'Common struggles', 'Comfort'),
  (19, 'Psalms', 46, 1, 'Common struggles', 'Fear'),
  (55, '2 Timothy', 1, 7, 'Common struggles', 'Fear'),
  (45, 'Romans', 8, 28, 'Common struggles', 'Hope'),
  (24, 'Jeremiah', 29, 11, 'Common struggles', 'Hope'),
  (20, 'Proverbs', 3, 5, 'Common struggles', 'Guidance'),
  (20, 'Proverbs', 3, 6, 'Common struggles', 'Guidance'),
  (45, 'Romans', 15, 13, 'Common struggles', 'Faith')
on conflict (book_id, chapter, verse, struggle) do update
set book_name = excluded.book_name,
    category = excluded.category;
