import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [
    { count: conversations },
    { count: problems },
    { count: ideas },
    { count: knowledge },
    { count: memories },
    { data: recentConvos },
    { data: usageData },
  ] = await Promise.all([
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("problems").select("*", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("ideas").select("*", { count: "exact", head: true }),
    supabase.from("knowledge_base").select("*", { count: "exact", head: true }),
    supabase.from("agent_memories").select("*", { count: "exact", head: true }),
    supabase
      .from("conversations")
      .select("id, agent_slug, agent_name, agent_emoji, title, conversation_type, project_slug, updated_at")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("conversations")
      .select("input_tokens, output_tokens, cost_usd"),
  ]);

  // Aggregate usage
  const totalInputTokens = usageData?.reduce((s, r) => s + (r.input_tokens || 0), 0) ?? 0;
  const totalOutputTokens = usageData?.reduce((s, r) => s + (r.output_tokens || 0), 0) ?? 0;
  const totalCostUsd = usageData?.reduce((s, r) => s + parseFloat(r.cost_usd || 0), 0) ?? 0;

  return NextResponse.json({
    stats: {
      conversations: conversations ?? 0,
      problems: problems ?? 0,
      ideas: ideas ?? 0,
      knowledge: knowledge ?? 0,
      memories: memories ?? 0,
    },
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      costUsd: parseFloat(totalCostUsd.toFixed(4)),
    },
    recentConversations: recentConvos ?? [],
  });
}
