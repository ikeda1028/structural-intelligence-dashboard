import { NextResponse } from "next/server";
import { crawlSource, shouldCrawl } from "@/lib/crawler";
import { listSources } from "@/lib/repository";
import type { Source } from "@/lib/types";

const evidenceCategories = ["政治・国際機関", "経済・金融", "思想・社会", "テクノロジー"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const authorization = request.headers.get("authorization");
  const expectedAuthorization = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && authorization !== expectedAuthorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await listSources();
  const targets = selectBalancedEvidenceTargets(sources.filter((source) => shouldCrawl(source)), 20);
  const results = await Promise.allSettled(targets.map((source) => crawlSource(source)));

  return NextResponse.json({
    targets: targets.length,
    results: results.map((result) => result.status === "fulfilled" ? result.value : {
      error: result.reason instanceof Error ? result.reason.message : "Unknown error"
    })
  });
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
