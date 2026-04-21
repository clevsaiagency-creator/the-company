"use client";

import { useState, useEffect } from "react";
import { Plus, Video, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getVideos, createVideo } from "@/lib/db/videos";
import type { DbVideo } from "@/lib/supabase";

function detectPlatform(url: string): string {
  if (url.includes("youtube") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("tiktok")) return "TikTok";
  if (url.includes("instagram")) return "Instagram";
  return "Other";
}

export default function VideosPage() {
  const [videos, setVideos] = useState<DbVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    getVideos().then((data) => {
      setVideos(data);
      setLoading(false);
    });
  }, []);

  const analyzeVideo = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    const platform = detectPlatform(url);
    let summary = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: "user",
            content: `Analizează acest video (${platform}): ${url}\n\nExtrage: ideea principală, ce pot aplica în afacerile mele, și categorizează-l.`,
            timestamp: Date.now(),
          }],
          agentSlug: "analytics-director",
          conversationType: "one_on_one",
        }),
      });

      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));
            if (data.type === "text" && data.content) summary += data.content;
          }
        }
      }
    } catch {
      summary = "Nu am putut analiza acest video.";
    }

    const video = await createVideo({ url: url.trim(), platform, summary, category: "General" });
    if (video) setVideos((prev) => [video, ...prev]);
    setUrl("");
    setShowForm(false);
    setAnalyzing(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Video Intelligence</h1>
            <p className="text-muted-foreground text-sm">Paste un link video. AI-ul extrage ideea și propune aplicare.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? "Anulează" : "Video nou"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6 space-y-4">
            <Input placeholder="Paste link YouTube, TikTok, Instagram..." value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
            <Button onClick={analyzeVideo} disabled={!url.trim() || analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
              Analizează
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : videos.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Niciun video analizat. Adaugă un link pentru a începe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => (
              <div key={video.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{video.platform}</Badge>
                    <a href={video.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      Deschide <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Badge variant="outline">{video.status}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{video.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
