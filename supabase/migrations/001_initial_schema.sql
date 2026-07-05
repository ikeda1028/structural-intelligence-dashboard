create extension if not exists "pgcrypto";

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('RSS', 'Website', 'API', 'ThinkTank', 'Government', 'InternationalOrganization', 'Academic', 'NewsMedia')),
  url text not null,
  country text not null,
  region text not null,
  language text not null,
  category text not null,
  reliability_score int not null default 80 check (reliability_score between 0 and 100),
  crawl_frequency text not null check (crawl_frequency in ('hourly', 'every_6_hours', 'daily', 'weekly')),
  is_active boolean not null default true,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists crawled_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  title text not null,
  url text not null unique,
  published_at timestamptz,
  crawled_at timestamptz not null default now(),
  author text,
  language text,
  raw_html text,
  raw_text text,
  extracted_text text,
  summary_ja text,
  category text,
  region text,
  tags text[],
  importance_score int check (importance_score between 0 and 100),
  duplicate_group_id text,
  analysis_status text not null default 'pending' check (analysis_status in ('pending', 'analyzed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists crawl_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null check (status in ('success', 'failed', 'partial')),
  items_found int not null default 0,
  items_saved int not null default 0,
  error_message text
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  crawled_item_id uuid not null references crawled_items(id) on delete cascade,
  what_happened text not null,
  why_important text not null,
  underlying_structure text not null,
  strengthening_forces text[] not null default '{}',
  weakening_forces text[] not null default '{}',
  stakeholders text[] not null default '{}',
  medium_term_meaning text not null,
  future_hypotheses jsonb not null default '[]'::jsonb,
  risks text[] not null default '{}',
  opportunities text[] not null default '{}',
  tla_implications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crawled_items_source_id_idx on crawled_items(source_id);
create index if not exists crawled_items_crawled_at_idx on crawled_items(crawled_at desc);
create index if not exists crawled_items_duplicate_group_idx on crawled_items(duplicate_group_id);
create index if not exists crawl_logs_source_id_idx on crawl_logs(source_id);
