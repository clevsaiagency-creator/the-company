import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentMemory = {
  id: string;
  agent_slug: string;
  project_slug: string;
  content: string;
  importance: "low" | "normal" | "high" | "critical";
  source_conversation_id: string | null;
  created_at: string;
};

export type MemoryInsert = {
  agentSlug: string;
  projectSlug?: string;
  content: string;
  importance?: "low" | "normal" | "high" | "critical";
  sourceConversationId?: string;
};

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getAgentMemories(
  agentSlug: string,
  projectSlug: string = "all",
  limit: number = 20
): Promise<AgentMemory[]> {
  const { data, error } = await supabase
    .from("agent_memories")
    .select()
    .eq("agent_slug", agentSlug)
    .or(`project_slug.eq.${projectSlug},project_slug.eq.all`)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAgentMemories error:", error);
    return [];
  }
  return data || [];
}

export async function getMemoriesForPrompt(
  agentSlug: string,
  projectSlug: string
): Promise<string> {
  const memories = await getAgentMemories(agentSlug, projectSlug);
  if (memories.length === 0) return "";

  const lines = memories.map((m) => {
    const badge =
      m.importance === "critical"
        ? "[CRITIC]"
        : m.importance === "high"
          ? "[IMPORTANT]"
          : "";
    return `- ${badge} ${m.content}`.trim();
  });

  return `\n=== MEMORIILE TALE ===\nAcestea sunt lucruri pe care le-ai reținut din sesiuni anterioare:\n${lines.join("\n")}\n=== END MEMORII ===`;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function saveMemory(
  memory: MemoryInsert
): Promise<AgentMemory | null> {
  const { data, error } = await supabase
    .from("agent_memories")
    .insert({
      agent_slug: memory.agentSlug,
      project_slug: memory.projectSlug || "all",
      content: memory.content,
      importance: memory.importance || "normal",
      source_conversation_id: memory.sourceConversationId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("saveMemory error:", error);
    return null;
  }
  return data;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("agent_memories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteMemory error:", error);
    return false;
  }
  return true;
}

export async function getAllMemories(
  projectSlug?: string
): Promise<AgentMemory[]> {
  let query = supabase
    .from("agent_memories")
    .select()
    .order("agent_slug")
    .order("created_at", { ascending: false });

  if (projectSlug && projectSlug !== "all") {
    query = query.or(`project_slug.eq.${projectSlug},project_slug.eq.all`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getAllMemories error:", error);
    return [];
  }
  return data || [];
}
