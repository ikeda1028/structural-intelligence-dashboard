import { NextResponse } from "next/server";
import { patchSource } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const patch = await request.json();
  return NextResponse.json({ source: await patchSource(id, patch) });
}

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const form = await request.formData();
  const patch = Object.fromEntries(form.entries());
  const normalized = {
    ...patch,
    is_active: patch.is_active === "true",
    reliability_score: patch.reliability_score ? Number(patch.reliability_score) : undefined
  };
  await patchSource(id, normalized);
  return NextResponse.redirect(new URL("/sources", request.url), 303);
}
