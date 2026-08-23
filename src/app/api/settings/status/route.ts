import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const anthropic = !!(
    process.env.ANTHROPIC_API_KEY && process.env.AI_MODE === "live"
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const tables: Record<string, string> = {};
  let supabase_ok = false;

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const tableNames = ["conversations", "messages", "knowledge_base", "agent_memories", "ideas", "problems"];

    await Promise.all(
      tableNames.map(async (t) => {
        const { error } = await supabase.from(t).select("id").limit(1);
        tables[t] = error ? `EROARE: ${error.message}` : "OK";
      })
    );

    supabase_ok = Object.values(tables).every((v) => v === "OK");
  } else {
    tables["config"] = "NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY lipsesc";
  }

  return Response.json({
    anthropic,
    supabase: supabase_ok,
    tables,
    version: "v1.0",
  });
}
