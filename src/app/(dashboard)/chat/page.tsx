"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Briefcase, TrendingUp, Megaphone, Cpu, BarChart2, DollarSign, Scale, Headphones, Zap } from "lucide-react";
import { AGENTS } from "@/lib/ai/agents";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ChatWindow from "@/components/chat/ChatWindow";
import { useProject, PROJECTS } from "@/lib/project-context";

type ViewMode = "select" | "board_meeting" | "smart_chat";

const DEPARTMENTS = [
  { key: "executive", label: "Executive", icon: Briefcase },
  { key: "sales", label: "Sales", icon: TrendingUp },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "tech", label: "Tech", icon: Cpu },
  { key: "analytics", label: "Analytics", icon: BarChart2 },
  { key: "finance", label: "Finance", icon: DollarSign },
  { key: "legal", label: "Legal", icon: Scale },
  { key: "support", label: "Support", icon: Headphones },
];

export default function ChatPage() {
  const [view, setView] = useState<ViewMode>("select");
  const { projectSlug } = useProject();
  const currentProject = PROJECTS.find((p) => p.slug === projectSlug) || PROJECTS[0];

  if (view === "smart_chat") {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <button
            onClick={() => setView("select")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Înapoi
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h1 className="font-semibold">Smart Chat</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {currentProject.emoji} {currentProject.name}
          </Badge>
        </div>
        <ChatWindow
          agentSlug="auto"
          agentName="Smart Chat"
          agentEmoji="⚡"
          conversationType="orchestrated"
          placeholder="Scrie orice — compania se organizează automat..."
        />
      </div>
    );
  }

  if (view === "board_meeting") {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <button
            onClick={() => setView("select")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Înapoi
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            <h1 className="font-semibold">Board Meeting</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {currentProject.emoji} {currentProject.name}
          </Badge>
        </div>
        <ChatWindow
          agentSlug="ceo"
          agentName="Board Meeting"
          agentEmoji="🏛️"
          conversationType="board_meeting"
          placeholder="Pune o întrebare sau dă o directivă..."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">Company Chat</h1>
          <Badge variant="outline" className="text-sm">
            {currentProject.emoji} {currentProject.name}
          </Badge>
        </div>
        <p className="text-muted-foreground mb-8">
          Alege cu cine vrei să vorbești.
        </p>

        {/* Smart Chat + Board Meeting CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setView("smart_chat")}
            className="p-6 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  Smart Chat
                  <Zap className="h-4 w-4 text-primary" />
                </h2>
                <p className="text-sm text-muted-foreground">
                  Scrie orice — compania rutează automat la agentul potrivit.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setView("board_meeting")}
            className="p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  Board Meeting
                  <Users className="h-4 w-4 text-muted-foreground" />
                </h2>
                <p className="text-sm text-muted-foreground">
                  Toți directorii deliberează împreună.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Agents by department */}
        {DEPARTMENTS.map((dept) => {
          const agents = AGENTS.filter((a) => a.department === dept.key);
          if (agents.length === 0) return null;

          const directors = agents.filter((a) => a.level === "c-suite" || a.level === "director");
          const subAgents = agents.filter((a) => a.level === "lead" || a.level === "specialist");

          return (
            <div key={dept.key} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <dept.icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {dept.label}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Directors first */}
                {directors.map((agent) => (
                  <Link
                    key={agent.slug}
                    href={`/chat/${agent.slug}`}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border border-border bg-card",
                      "hover:border-primary/50 hover:bg-accent transition-colors"
                    )}
                  >
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                    </div>
                  </Link>
                ))}

                {/* Sub-agents */}
                {subAgents.map((agent) => (
                  <Link
                    key={agent.slug}
                    href={`/chat/${agent.slug}`}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/60",
                      "hover:border-primary/40 hover:bg-accent transition-colors"
                    )}
                  >
                    <span className="text-xl">{agent.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[10px] shrink-0 opacity-60">
                      sub-agent
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
