import { initialSources } from "@/lib/sources-seed";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { CrawledItem, CrawlLog, IntelligenceResearchRecord, RiskResponseResearchRecord, Source } from "@/lib/types";

const demoState: {
  sources: Source[];
  items: CrawledItem[];
  logs: CrawlLog[];
  intelligenceReports: IntelligenceResearchRecord[];
  riskReports: RiskResponseResearchRecord[];
} = {
  sources: [...initialSources],
  items: [],
  logs: [],
  intelligenceReports: [],
  riskReports: []
};

const today = () => new Date().toISOString().slice(0, 10);

export async function listSources() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoState.sources;

  const { data, error } = await supabase.from("sources").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const sources = data as Source[];
  const existingSources = new Map(sources.map((source) => [source.id, source]));
  const seedUpdates = initialSources.filter((source) => {
    const existing = existingSources.get(source.id);
    return !existing
      || existing.name !== source.name
      || existing.url !== source.url
      || existing.source_type !== source.source_type
      || existing.country !== source.country
      || existing.region !== source.region
      || existing.language !== source.language
      || existing.category !== source.category
      || existing.reliability_score !== source.reliability_score
      || existing.crawl_frequency !== source.crawl_frequency;
  });

  if (seedUpdates.length === 0) return sources;

  const { error: seedError } = await supabase.from("sources").upsert(seedUpdates, { onConflict: "id" });
  if (seedError) throw seedError;

  const sourceUpdates = new Map(seedUpdates.map((source) => [source.id, source]));
  return [
    ...seedUpdates.filter((source) => !existingSources.has(source.id)),
    ...sources.map((source) => sourceUpdates.get(source.id) ?? source)
  ];
}

export async function upsertSource(input: Partial<Source>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const source = {
      ...input,
      id: input.id ?? crypto.randomUUID(),
      created_at: input.created_at ?? new Date().toISOString()
    } as Source;
    const index = demoState.sources.findIndex((item) => item.id === source.id);
    if (index >= 0) {
      demoState.sources[index] = { ...demoState.sources[index], ...source };
    } else {
      demoState.sources.unshift(source);
    }
    return source;
  }

  const payload = { ...input, id: input.id ?? crypto.randomUUID(), created_at: input.created_at ?? new Date().toISOString() };
  const { data, error } = await supabase.from("sources").upsert(payload).select("*").single();
  if (error) throw error;
  return data as Source;
}

export async function patchSource(id: string, patch: Partial<Source>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const index = demoState.sources.findIndex((source) => source.id === id);
    if (index < 0) return undefined;
    demoState.sources[index] = { ...demoState.sources[index], ...patch };
    return demoState.sources[index];
  }

  const { data, error } = await supabase.from("sources").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Source;
}

export async function insertCrawlLog(log: CrawlLog) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    demoState.logs.unshift(log);
    return log;
  }
  const { error } = await supabase.from("crawl_logs").insert(log);
  if (error) throw error;
  return log;
}

export async function insertCrawledItems(items: CrawledItem[]) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const existing = new Set(demoState.items.map((item) => item.url));
    const fresh = items.filter((item) => !existing.has(item.url));
    demoState.items.unshift(...fresh);
    return fresh;
  }
  if (items.length === 0) return items;

  const { data, error } = await supabase
    .from("crawled_items")
    .upsert(items, { onConflict: "url" })
    .select("*");
  if (error) throw error;
  return data as CrawledItem[];
}

export async function markSourceCrawled(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const source = demoState.sources.find((item) => item.id === id);
    if (source) source.last_crawled_at = new Date().toISOString();
    return;
  }
  await supabase.from("sources").update({ last_crawled_at: new Date().toISOString() }).eq("id", id);
}

export async function listDashboardItems(limit = 12) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoState.items.slice(0, limit);

  const { data, error } = await supabase
    .from("crawled_items")
    .select("*, sources(name)")
    .order("crawled_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function saveIntelligenceResearchReport(
  input: Omit<IntelligenceResearchRecord, "id" | "report_date" | "created_at" | "updated_at"> & { report_date?: string }
) {
  const now = new Date().toISOString();
  const reportDate = input.report_date ?? today();
  const payload = {
    ...input,
    report_date: reportDate,
    updated_at: now
  };
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const existingIndex = demoState.intelligenceReports.findIndex((report) => report.target === input.target && report.report_date === reportDate);
    const record = {
      ...payload,
      id: existingIndex >= 0 ? demoState.intelligenceReports[existingIndex].id : crypto.randomUUID(),
      created_at: existingIndex >= 0 ? demoState.intelligenceReports[existingIndex].created_at : now
    } as IntelligenceResearchRecord;
    if (existingIndex >= 0) demoState.intelligenceReports[existingIndex] = record;
    else demoState.intelligenceReports.unshift(record);
    return record;
  }

  const { data, error } = await supabase
    .from("intelligence_research_reports")
    .upsert(payload, { onConflict: "target,report_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as IntelligenceResearchRecord;
}

export async function saveRiskResponseResearchReport(
  input: Omit<RiskResponseResearchRecord, "id" | "report_date" | "created_at" | "updated_at"> & { report_date?: string }
) {
  const now = new Date().toISOString();
  const reportDate = input.report_date ?? today();
  const payload = {
    ...input,
    report_date: reportDate,
    updated_at: now
  };
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const existingIndex = demoState.riskReports.findIndex((report) => report.target === input.target && report.report_date === reportDate);
    const record = {
      ...payload,
      id: existingIndex >= 0 ? demoState.riskReports[existingIndex].id : crypto.randomUUID(),
      created_at: existingIndex >= 0 ? demoState.riskReports[existingIndex].created_at : now
    } as RiskResponseResearchRecord;
    if (existingIndex >= 0) demoState.riskReports[existingIndex] = record;
    else demoState.riskReports.unshift(record);
    return record;
  }

  const { data, error } = await supabase
    .from("risk_response_research_reports")
    .upsert(payload, { onConflict: "target,report_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as RiskResponseResearchRecord;
}

export async function listIntelligenceResearchReports(limit = 20) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoState.intelligenceReports.slice(0, limit);

  const { data, error } = await supabase
    .from("intelligence_research_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as IntelligenceResearchRecord[];
}

export async function listRiskResponseResearchReports(limit = 20) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoState.riskReports.slice(0, limit);

  const { data, error } = await supabase
    .from("risk_response_research_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as RiskResponseResearchRecord[];
}
