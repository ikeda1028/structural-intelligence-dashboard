export type SourceType =
  | "RSS"
  | "Website"
  | "API"
  | "ThinkTank"
  | "Government"
  | "InternationalOrganization"
  | "Academic"
  | "NewsMedia";

export type CrawlFrequency = "hourly" | "every_6_hours" | "daily" | "weekly";

export type Source = {
  id: string;
  name: string;
  source_type: SourceType;
  url: string;
  country: string;
  region: string;
  language: string;
  category: string;
  reliability_score: number;
  crawl_frequency: CrawlFrequency;
  is_active: boolean;
  last_crawled_at?: string;
  created_at: string;
};

export type CrawledItem = {
  id: string;
  source_id: string;
  title: string;
  url: string;
  published_at?: string;
  crawled_at: string;
  author?: string;
  language?: string;
  raw_html?: string;
  raw_text?: string;
  extracted_text?: string;
  summary_ja?: string;
  category?: string;
  region?: string;
  tags?: string[];
  importance_score?: number;
  duplicate_group_id?: string;
  analysis_status: "pending" | "analyzed" | "failed";
  created_at: string;
};

export type CrawlLog = {
  id: string;
  source_id: string;
  started_at: string;
  finished_at?: string;
  status: "success" | "failed" | "partial";
  items_found: number;
  items_saved: number;
  error_message?: string;
};

export type FutureHypothesis = {
  title: string;
  description: string;
  time_horizon: "3_months" | "1_year" | "3_years";
  confidence_level: "low" | "medium" | "high";
  evidence: string;
};

export type TlaImplications = {
  education: string;
  human_resource_development: string;
  regional_revitalization: string;
  content_business: string;
  dao_nft_certification: string;
  investment_theme: string;
  proposal_targets: string[];
};

export type Analysis = {
  id: string;
  crawled_item_id: string;
  what_happened: string;
  why_important: string;
  underlying_structure: string;
  strengthening_forces: string[];
  weakening_forces: string[];
  stakeholders: string[];
  medium_term_meaning: string;
  future_hypotheses: FutureHypothesis[];
  risks: string[];
  opportunities: string[];
  tla_implications: TlaImplications;
  created_at: string;
};

export type IntelligenceResearchRecord = {
  id: string;
  target: string;
  query: string;
  report_date: string;
  headline: string;
  report: unknown;
  analysis_mode: unknown;
  quadrants: unknown[];
  countries: unknown[];
  related_sources: unknown[];
  related_items: unknown[];
  impact_paths: string[];
  recommended_next_searches: string[];
  created_at: string;
  updated_at: string;
};

export type RiskResponseResearchRecord = {
  id: string;
  target: string;
  report_date: string;
  generated_at: string;
  analysis_mode: string;
  overall_score: number;
  overall_assessment: string;
  risks: unknown[];
  competitors: unknown[];
  next_research_questions: string[];
  raw_result: unknown;
  created_at: string;
  updated_at: string;
};
