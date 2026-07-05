import { NextResponse } from "next/server";
import { analyzeItem } from "@/lib/analysis";

export async function POST(request: Request) {
  const item = await request.json();
  const analysis = await analyzeItem(item);
  return NextResponse.json({ analysis });
}
