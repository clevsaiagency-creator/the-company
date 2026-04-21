import { supabase, type DbProblem } from "@/lib/supabase";

export async function getProblems(): Promise<DbProblem[]> {
  const { data, error } = await supabase
    .from("problems")
    .select()
    .order("created_at", { ascending: false });
  if (error) { console.error("getProblems error:", error); return []; }
  return data || [];
}

export async function createProblem(params: {
  title: string;
  description: string;
  business: string;
  severity: string;
}): Promise<DbProblem | null> {
  const { data, error } = await supabase
    .from("problems")
    .insert({ ...params, status: "open", solutions: "" })
    .select()
    .single();
  if (error) { console.error("createProblem error:", error); return null; }
  return data;
}

export async function updateProblemSolutions(id: string, solutions: string): Promise<void> {
  await supabase
    .from("problems")
    .update({ solutions, status: "solution_proposed" })
    .eq("id", id);
}

export async function updateProblemStatus(id: string, status: string): Promise<void> {
  await supabase.from("problems").update({ status }).eq("id", id);
}
