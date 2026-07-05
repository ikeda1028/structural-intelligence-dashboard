import { NextResponse } from "next/server";
import { listSources, upsertSource } from "@/lib/repository";
import type { CrawlFrequency, SourceType } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ sources: await listSources() });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const source = await upsertSource({
    name: String(form.get("name")),
    url: String(form.get("url")),
    source_type: String(form.get("source_type")) as SourceType,
    country: String(form.get("country")),
    region: String(form.get("region")),
    language: String(form.get("language")),
    category: String(form.get("category")),
    reliability_score: Number(form.get("reliability_score") || 80),
    crawl_frequency: String(form.get("crawl_frequency") || "daily") as CrawlFrequency,
    is_active: true
  });

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/sources", request.url), 303);
  }
  return NextResponse.json({ source }, { status: 201 });
}
