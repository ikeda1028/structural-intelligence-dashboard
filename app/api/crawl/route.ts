import { NextResponse } from "next/server";
import { crawlSource, shouldCrawl } from "@/lib/crawler";
import { listSources } from "@/lib/repository";
import type { Source } from "@/lib/types";

const evidenceCategories = ["政治・国際機関", "経済・金融", "思想・社会", "テクノロジー"];
const countryLayerCountries = [
  "US", "CN", "EU", "JP", "IN", "UK", "DE", "FR", "KR", "TW", "SG",
  "ID", "VN", "TH", "MY", "PH",
  "NG", "ZA", "KE", "EG",
  "BR", "MX", "AR", "CL", "CO"
];

export async function POST(request: Request) {
  const sources = await listSources();
  const url = new URL(request.url);
  const requestedSourceId = url.searchParams.get("source_id");
  const layer = url.searchParams.get("layer");
  const candidates = sources.filter((source) => requestedSourceId ? source.id === requestedSourceId : shouldCrawl(source));
  const targets = requestedSourceId
    ? candidates.slice(0, 1)
    : layer === "country"
      ? selectCountryLayerTargets(candidates, 48)
      : selectBalancedEvidenceTargets(candidates, 16);

  const results = await Promise.allSettled(targets.map((source) => crawlSource(source)));
  const payload = results.map((result) => result.status === "fulfilled"
    ? { status: "success", ...result.value }
    : { status: "failed", error: result.reason instanceof Error ? result.reason.message : "Unknown error" });

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  return NextResponse.json({ crawled: payload });
}

function selectBalancedEvidenceTargets(sources: Source[], limit: number) {
  const targets: Source[] = [];
  const seen = new Set<string>();
  const perCategory = Math.max(1, Math.floor(limit / evidenceCategories.length));

  for (const category of evidenceCategories) {
    for (const source of sources.filter((item) => item.category === category).slice(0, perCategory)) {
      targets.push(source);
      seen.add(source.id);
    }
  }

  for (const source of sources) {
    if (targets.length >= limit) break;
    if (!seen.has(source.id)) targets.push(source);
  }

  return targets;
}

function selectCountryLayerTargets(sources: Source[], limit: number) {
  const targets: Source[] = [];
  const seen = new Set<string>();

  for (const country of countryLayerCountries) {
    for (const category of evidenceCategories) {
      const source = sources.find((item) => item.country === country && item.category === category && !seen.has(item.id));
      if (!source) continue;
      targets.push(source);
      seen.add(source.id);
      if (targets.length >= limit) return targets;
    }
  }

  for (const source of sources) {
    if (targets.length >= limit) break;
    if (!seen.has(source.id)) targets.push(source);
  }

  return targets;
}
