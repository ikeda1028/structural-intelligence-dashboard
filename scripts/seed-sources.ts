import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { initialSources } from "../lib/sources-seed";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { error } = await supabase.from("sources").upsert(initialSources, { onConflict: "id" });

  if (error) throw error;
  console.log(`Seeded ${initialSources.length} sources.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
