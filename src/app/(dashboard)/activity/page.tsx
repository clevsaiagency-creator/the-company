"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  MessageSquare,
  Brain,
  BookOpen,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject } from "@/lib/project-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "conversation" | "memory" | "knowledge";
  title: string;
  subtitle: string;
  emoji: string;
  timestamp: string;
  agentSlug?: string;
  meta?: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { projectSlug } = useProject();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadActivity() {
    setLoading(true);
    try {
      const [convRes, memRes, kbRes] = await Promise.all([
        fetch(`/api/activity/conversations?project=${projectSlug}`),
        fetch(`/api/memories?project=${projectSlug}`),
        fetch(`/api/knowledge?project=${projectSlug}`),
      ]);

      const conversations = await convRes.json();
      const memories = await memRes.json();
      const knowledge = await kbRes.json();

      const items: ActivityItem[] = [];

      // Recent conversations
      if (Array.isArray(conversations)) {
        for (const conv of conversations.slice(0, 20)) {
          items.push({
            id: `conv-${conv.id}`,
            type: "conversation",
            title: conv.title || "Conversatie fara titlu",
            subtitle: `${conv.agent_emoji || "🤖"} ${conv.agent_name || conv.agent_slug} — ${conv.conversation_type}`,
            emoji: conv.agent_emoji || "💬",
            timestamp: conv.updated_at,
            agentSlug: conv.agent_slug,
            meta: `${conv.message_count || 0} mesaje`,
          });
        }
      }

      // Agent memories
      if (Array.isArray(memories)) {
        for (const mem of memories.slice(0, 20)) {
          items.push({
            id: `mem-${mem.id}`,
            type: "memory",
            title: mem.content.slice(0, 80) + (mem.content.length > 80 ? "..." : ""),
            subtitle: mem.agent_slug,
            emoji: "🧠",
            timestamp: mem.created_at,
            agentSlug: mem.agent_slug,
            meta: mem.importance,
          });
        }
      }

      // Knowledge base updates
      if (Array.isArray(knowledge)) {
        for (const kb of knowledge.slice(0, 10)) {
          items.push({
            id: `kb-${kb.id}`,
            type: "knowledge",
            title: kb.title,
            subtitle: kb.category,
            emoji: "📚",
            timestamp: kb.updated_at,
            meta: kb.project_slug,
          });
        }
      }

      // Sort by timestamp descending
      items.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(items);
    } catch {
      setActivities([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadActivity();
  }, [projectSlug]);

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "acum";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "conversation":
        return <MessageSquare className="h-3.5 w-3.5" />;
      case "memory":
        return <Brain className="h-3.5 w-3.5" />;
      case "knowledge":
        return <BookOpen className="h-3.5 w-3.5" />;
      default:
        return <Activity className="h-3.5 w-3.5" />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "conversation":
        return "text-blue-400";
      case "memory":
        return "text-purple-400";
      case "knowledge":
        return "text-green-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Activity Feed
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tot ce se intampla in companie.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadActivity}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
          </Button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-1">Nicio activitate</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Incepe o conversatie cu un agent si activitatea va aparea aici.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-1">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="relative flex items-start gap-4 py-3 px-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "relative z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full bg-background border-2 border-border shrink-0 mt-0.5",
                      typeColor(item.type)
                    )}
                  >
                    {typeIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm">{item.emoji}</span>
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{item.subtitle}</span>
                      {item.meta && (
                        <>
                          <span>·</span>
                          <span>{item.meta}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 shrink-0 mt-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(item.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
