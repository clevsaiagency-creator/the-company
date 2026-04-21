import { supabase, type DbIdea } from "@/lib/supabase";

export async function getIdeas(): Promise<DbIdea[]> {
  const { data, error } = await supabase
    .from("ideas")
    .select()
    .order("created_at", { ascending: false });
  if (error) { console.error("getIdeas error:", error); return []; }
  return data || [];
}

export async function createIdea(params: {
  title: string;
  description: string;
  category: string;
  business: string;
}): Promise<DbIdea | null> {
  const { data, error } = await supabase
    .from("ideas")
    .insert({ ...params, status: "new", analysis: "" })
    .select()
    .single();
  if (error) { console.error("createIdea error:", error); return null; }
  return data;
}

export async function updateIdeaAnalysis(id: string, analysis: string): Promise<void> {
  await supabase
    .from("ideas")
    .update({ analysis, status: "analyzed" })
    .eq("id", id);
}

export async function deleteIdea(id: string): Promise<void> {
  await supabase.from("ideas").delete().eq("id", id);
}
