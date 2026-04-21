import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DbConversation = {
  id: string;
  agent_slug: string;
  agent_name: string;
  agent_emoji: string;
  conversation_type: string;
  project_slug: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "agent" | "system";
  agent_slug: string | null;
  agent_name: string | null;
  agent_emoji: string | null;
  content: string;
  timestamp: number;
  created_at: string;
};

export type DbIdea = {
  id: string;
  title: string;
  description: string;
  category: string;
  business: string;
  status: string;
  analysis: string;
  created_at: string;
};

export type DbProblem = {
  id: string;
  title: string;
  description: string;
  business: string;
  severity: string;
  status: string;
  solutions: string;
  created_at: string;
};

export type DbVideo = {
  id: string;
  url: string;
  platform: string;
  summary: string;
  category: string;
  status: string;
  created_at: string;
};
