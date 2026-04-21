import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  project_slug: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type KnowledgeInsert = {
  category: string;
  title: string;
  content: string;
  project_slug?: string;
  tags?: string[];
};

// ─── Knowledge Base Categories ───────────────────────────────────────────────

export const KB_CATEGORIES = [
  { value: "business", label: "Business Info" },
  { value: "clients", label: "Clienți & Leads" },
  { value: "processes", label: "Procese & SOPs" },
  { value: "preferences", label: "Preferințe" },
  { value: "metrics", label: "Metrici & KPIs" },
  { value: "general", label: "General" },
] as const;

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function getKnowledge(
  projectSlug?: string,
  category?: string
): Promise<KnowledgeEntry[]> {
  let query = supabase
    .from("knowledge_base")
    .select()
    .order("updated_at", { ascending: false });

  if (projectSlug && projectSlug !== "all") {
    query = query.or(`project_slug.eq.${projectSlug},project_slug.eq.all`);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getKnowledge error:", error);
    return [];
  }
  return data || [];
}

export async function getKnowledgeForAgent(
  projectSlug: string
): Promise<string> {
  const entries = await getKnowledge(projectSlug);
  if (entries.length === 0) return "";

  const sections = entries.map(
    (e) => `### ${e.title} [${e.category}]\n${e.content}`
  );

  return `\n=== KNOWLEDGE BASE ===\n${sections.join("\n\n")}\n=== END KNOWLEDGE BASE ===`;
}

export async function createKnowledge(
  entry: KnowledgeInsert
): Promise<KnowledgeEntry | null> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .insert({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      project_slug: entry.project_slug || "all",
      tags: entry.tags || [],
    })
    .select()
    .single();

  if (error) {
    console.error("createKnowledge error:", error);
    return null;
  }
  return data;
}

export async function updateKnowledge(
  id: string,
  updates: Partial<KnowledgeInsert>
): Promise<KnowledgeEntry | null> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateKnowledge error:", error);
    return null;
  }
  return data;
}

export async function deleteKnowledge(id: string): Promise<boolean> {
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) {
    console.error("deleteKnowledge error:", error);
    return false;
  }
  return true;
}
