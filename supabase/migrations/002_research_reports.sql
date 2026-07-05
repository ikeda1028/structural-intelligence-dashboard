create table if not exists intelligence_research_reports (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  query text not null,
  report_date date not null default current_date,
  headline text not null,
  report jsonb not null default '{}'::jsonb,
  analysis_mode jsonb not null default '{}'::jsonb,
  quadrants jsonb not null default '[]'::jsonb,
  countries jsonb not null default '[]'::jsonb,
  related_sources jsonb not null default '[]'::jsonb,
  related_items jsonb not null default '[]'::jsonb,
  impact_paths text[] not null default '{}',
  recommended_next_searches text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target, report_date)
);

create table if not exists risk_response_research_reports (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  report_date date not null default current_date,
  generated_at date not null,
  analysis_mode text not null,
  overall_score int not null check (overall_score between 0 and 100),
  overall_assessment text not null,
  risks jsonb not null default '[]'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  next_research_questions text[] not null default '{}',
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target, report_date)
);

create index if not exists intelligence_research_reports_target_idx on intelligence_research_reports(target);
create index if not exists intelligence_research_reports_report_date_idx on intelligence_research_reports(report_date desc);
create index if not exists risk_response_research_reports_target_idx on risk_response_research_reports(target);
create index if not exists risk_response_research_reports_report_date_idx on risk_response_research_reports(report_date desc);
create index if not exists risk_response_research_reports_score_idx on risk_response_research_reports(overall_score desc);
