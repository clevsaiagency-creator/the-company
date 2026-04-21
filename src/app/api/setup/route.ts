import { createClient } from "@supabase/supabase-js";

const SETUP_SQL = `
-- Knowledge Base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project_slug TEXT NOT NULL DEFAULT 'all',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_project_category ON knowledge_base(project_slug, category);

-- Agent Memories table
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL,
  project_slug TEXT NOT NULL DEFAULT 'all',
  content TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'normal',
  source_conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mem_agent_project ON agent_memories(agent_slug, project_slug);
`;

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return Response.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    db: { schema: "public" },
  });

  // Try to create tables by testing if they exist first
  const results: Record<string, string> = {};

  // Test knowledge_base
  const { error: kbError } = await supabase.from("knowledge_base").select("id").limit(1);
  if (kbError?.code === "PGRST205") {
    results.knowledge_base = "TABLE_MISSING — run the SQL migration in Supabase Dashboard";
  } else {
    results.knowledge_base = "OK";
  }

  // Test agent_memories
  const { error: memError } = await supabase.from("agent_memories").select("id").limit(1);
  if (memError?.code === "PGRST205") {
    results.agent_memories = "TABLE_MISSING — run the SQL migration in Supabase Dashboard";
  } else {
    results.agent_memories = "OK";
  }

  // Test existing tables
  const { error: convError } = await supabase.from("conversations").select("id").limit(1);
  results.conversations = convError ? `ERROR: ${convError.message}` : "OK";

  const allOk = results.knowledge_base === "OK" && results.agent_memories === "OK";

  return Response.json({
    status: allOk ? "ready" : "needs_migration",
    tables: results,
    migration_file: allOk ? null : "supabase-migrations/003_knowledge_base_and_memories.sql",
  });
}
