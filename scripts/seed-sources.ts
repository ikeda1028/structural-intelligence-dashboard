import { createClient } from "@supabase/supabase-js";
import { initialSources } from "../lib/sources-seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { error } = await supabase.from("sources").upsert(initialSources, { onConflict: "id" });

if (error) throw error;
console.log(`Seeded ${initialSources.length} sources.`);
