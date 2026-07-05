import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import Parser from "rss-parser";
import { insertCrawledItems, insertCrawlLog, markSourceCrawled } from "@/lib/repository";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CrawledItem, Source } from "@/lib/types";

const parser = new Parser();

function normalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.searchParams.sort();
  return parsed.toString();
}

function detectLanguage(text: string, fallback?: string) {
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return "ja";
  return fallback ?? "en";
}

function toDuplicateGroupId(url: string) {
  return normalizeUrl(url).replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

async function extractArticle(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "StructuralIntelligenceDashboard/0.1 (+contact: admin@example.com)"
    }
  });

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const $ = cheerio.load(html);
  const rawText = $("body").text().replace(/\s+/g, " ").trim();

  return {
    raw_html: html.slice(0, 120000),
    raw_text: rawText.slice(0, 60000),
    extracted_text: (article?.textContent || rawText).replace(/\s+/g, " ").trim().slice(0, 60000)
  };
}

async function crawlRss(source: Source) {
  const feed = await parser.parseURL(source.url);
  const items = feed.items.slice(0, 12);

  return items.map((item) => {
    const url = normalizeUrl(item.link || source.url);
    const text = [item.title, item.contentSnippet, item.content].filter(Boolean).join("\n");
    return {
      id: crypto.randomUUID(),
      source_id: source.id,
      title: item.title || feed.title || source.name,
      url,
      published_at: item.isoDate,
      crawled_at: new Date().toISOString(),
      author: item.creator,
      language: detectLanguage(text, source.language),
      raw_text: item.contentSnippet || item.content,
      extracted_text: text.slice(0, 60000),
      category: source.category,
      region: source.region,
      tags: [source.category, source.country, source.region].filter(Boolean),
      importance_score: Math.min(100, Math.round(source.reliability_score * 0.8)),
      duplicate_group_id: toDuplicateGroupId(url),
      analysis_status: "pending",
      created_at: new Date().toISOString()
    } satisfies CrawledItem;
  });
}

async function crawlWebsite(source: Source) {
  const url = normalizeUrl(source.url);
  const article = await extractArticle(url);
  return [{
    id: crypto.randomUUID(),
    source_id: source.id,
    title: source.name,
    url,
    crawled_at: new Date().toISOString(),
    language: detectLanguage(article.extracted_text, source.language),
    ...article,
    category: source.category,
    region: source.region,
    tags: [source.category, source.country, source.region].filter(Boolean),
    importance_score: Math.min(100, Math.round(source.reliability_score * 0.75)),
    duplicate_group_id: toDuplicateGroupId(url),
    analysis_status: "pending",
    created_at: new Date().toISOString()
  } satisfies CrawledItem];
}

function crawlDemo(source: Source) {
  const now = new Date().toISOString();
  return Array.from({ length: 3 }).map((_, index) => {
    const url = normalizeUrl(`${source.url}${source.url.includes("?") ? "&" : "?"}demo_item=${Date.now()}_${index}`);
    return {
      id: crypto.randomUUID(),
      source_id: source.id,
      title: `${source.name}: 構造変化シグナル ${index + 1}`,
      url,
      published_at: now,
      crawled_at: now,
      language: source.language,
      raw_text: "デモモードで生成されたクロール項目です。Supabaseと外部ネットワーク設定後は実データ取得に切り替わります。",
      extracted_text: `${source.category}領域で、${source.region}に関連する制度・市場・技術・社会受容の変化兆候を検出した想定データです。`,
      summary_ja: `${source.name}から、${source.category}領域の変化兆候を検出しました。TLA事業示唆に接続するためのデモ項目です。`,
      category: source.category,
      region: source.region,
      tags: [source.category, source.country, source.region, "demo"].filter(Boolean),
      importance_score: Math.min(100, Math.round(source.reliability_score * 0.82)),
      duplicate_group_id: toDuplicateGroupId(url),
      analysis_status: "pending",
      created_at: now
    } satisfies CrawledItem;
  });
}

export async function crawlSource(source: Source) {
  const startedAt = new Date().toISOString();
  try {
    const items = !isSupabaseConfigured
      ? crawlDemo(source)
      : source.source_type === "RSS" || source.url.includes("rss") || source.url.includes("feed")
      ? await crawlRss(source)
      : await crawlWebsite(source);
    const saved = await insertCrawledItems(items);
    await markSourceCrawled(source.id);
    await insertCrawlLog({
      id: crypto.randomUUID(),
      source_id: source.id,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      items_found: items.length,
      items_saved: saved.length
    });
    return { source: source.name, itemsFound: items.length, itemsSaved: saved.length };
  } catch (error) {
    await insertCrawlLog({
      id: crypto.randomUUID(),
      source_id: source.id,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "failed",
      items_found: 0,
      items_saved: 0,
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

export function shouldCrawl(source: Source, now = new Date()) {
  if (!source.is_active) return false;
  if (!source.last_crawled_at) return true;

  const elapsed = now.getTime() - new Date(source.last_crawled_at).getTime();
  const hours = elapsed / 1000 / 60 / 60;
  const thresholds = {
    hourly: 1,
    every_6_hours: 6,
    daily: 24,
    weekly: 168
  };
  return hours >= thresholds[source.crawl_frequency];
}
