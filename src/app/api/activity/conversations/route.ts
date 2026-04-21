import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project") || "all";

  let query = supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (projectSlug !== "all") {
    query = query.or(`project_slug.eq.${projectSlug},project_slug.eq.all`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("activity conversations error:", error);
    return Response.json([]);
  }

  // Get message counts per conversation
  const enriched = await Promise.all(
    (data || []).map(async (conv) => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id);

      return { ...conv, message_count: count || 0 };
    })
  );

  return Response.json(enriched);
}
