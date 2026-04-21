import { supabase, type DbConversation, type DbMessage } from "@/lib/supabase";

// ─── Conversations ────────────────────────────────────────────────────────────

export async function createConversation(params: {
  agentSlug: string;
  agentName: string;
  agentEmoji: string;
  conversationType: string;
  projectSlug: string;
  title?: string;
}): Promise<DbConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      agent_slug: params.agentSlug,
      agent_name: params.agentName,
      agent_emoji: params.agentEmoji,
      conversation_type: params.conversationType,
      project_slug: params.projectSlug,
      title: params.title || null,
    })
    .select()
    .single();

  if (error) {
    console.error("createConversation error:", error);
    return null;
  }
  return data;
}

export async function getLatestConversation(
  agentSlug: string,
  conversationType: string,
  projectSlug: string
): Promise<DbConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select()
    .eq("agent_slug", agentSlug)
    .eq("conversation_type", conversationType)
    .eq("project_slug", projectSlug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLatestConversation error:", error);
    return null;
  }
  return data;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  await supabase
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function getConversationHistory(
  agentSlug: string,
  conversationType: string,
  projectSlug: string,
  limit = 20
): Promise<DbConversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select()
    .eq("agent_slug", agentSlug)
    .eq("conversation_type", conversationType)
    .eq("project_slug", projectSlug)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getConversationHistory error:", error);
    return [];
  }
  return data || [];
}

export async function getConversationById(
  conversationId: string
): Promise<DbConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select()
    .eq("id", conversationId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function touchConversation(conversationId: string): Promise<void> {
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function addConversationUsage(
  conversationId: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  // Increment existing values
  const { data } = await supabase
    .from("conversations")
    .select("input_tokens, output_tokens, cost_usd")
    .eq("id", conversationId)
    .maybeSingle();

  if (!data) return;

  await supabase
    .from("conversations")
    .update({
      input_tokens: (data.input_tokens || 0) + inputTokens,
      output_tokens: (data.output_tokens || 0) + outputTokens,
      cost_usd: parseFloat(((data.cost_usd || 0) + costUsd).toFixed(6)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string
): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select()
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("getMessages error:", error);
    return [];
  }
  return data || [];
}

export async function saveMessage(params: {
  conversationId: string;
  role: "user" | "agent" | "system";
  agentSlug?: string;
  agentName?: string;
  agentEmoji?: string;
  content: string;
  timestamp: number;
}): Promise<DbMessage | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      agent_slug: params.agentSlug || null,
      agent_name: params.agentName || null,
      agent_emoji: params.agentEmoji || null,
      content: params.content,
      timestamp: params.timestamp,
    })
    .select()
    .single();

  if (error) {
    console.error("saveMessage error:", error);
    return null;
  }
  return data;
}
