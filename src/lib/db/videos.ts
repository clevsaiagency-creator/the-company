import { supabase, type DbVideo } from "@/lib/supabase";

export async function getVideos(): Promise<DbVideo[]> {
  const { data, error } = await supabase
    .from("videos")
    .select()
    .order("created_at", { ascending: false });
  if (error) { console.error("getVideos error:", error); return []; }
  return data || [];
}

export async function createVideo(params: {
  url: string;
  platform: string;
  summary: string;
  category: string;
}): Promise<DbVideo | null> {
  const { data, error } = await supabase
    .from("videos")
    .insert({ ...params, status: "analyzed" })
    .select()
    .single();
  if (error) { console.error("createVideo error:", error); return null; }
  return data;
}
