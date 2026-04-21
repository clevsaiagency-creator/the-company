"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Brain,
  Zap,
  Users,
  TrendingUp,
  ArrowRight,
  Clock,
  RefreshCw,
  Loader2,
  BarChart2,
  DollarSign,
  Play,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AGENTS } from "@/lib/ai/agents";

interface DashboardStats {
  conversations: number;
  problems: number;
  ideas: number;
  knowledge: number;
  memories: number;
}

interface UsageStats {
  totalTokens: number;
  costUsd: number;
}

interface RecentConversation {
  id: string;
  agent_slug: string;
  agent_name: string;
  agent_emoji: string;
  title: string | null;
  conversation_type: string;
  project_slug: string;
  updated_at: string;
}

const BUSINESSES = [
  {
    slug: "site-hustle",
    name: "Site Hustle",
    emoji: "🌐",
    description: "Vânzare site-uri €200",
    color: "border-l-green-500",
    kpis: [
      { label: "Leads", value: "1,030" },
      { label: "Interested", value: "8" },
      { label: "Sites built", value: "10" },
      { label: "Revenue", value: "€0" },
    ],
    status: "active",
    alert: "8 leads interested neconvertiți",
  },
  {
    slug: "ai-agency",
    name: "AI Agency",
    emoji: "🤖",
    description: "Voice agents & automatizări",
    color: "border-l-blue-500",
    kpis: [
      { label: "Clienți", value: "0" },
      { label: "Outreach", value: "0" },
      { label: "Discovery", value: "0" },
    ],
    status: "active",
    alert: "Zero outreach trimis",
  },
  {
    slug: "car-selling",
    name: "Car Selling",
    emoji: "🚗",
    description: "Automatizare OLX",
    color: "border-l-orange-500",
    kpis: [
      { label: "Tools", value: "8/8" },
      { label: "Teste reale", value: "0" },
    ],
    status: "testing",
    alert: null,
  },
  {
    slug: "music",
    name: "Music",
    emoji: "🎵",
    description: "Producție beats",
    color: "border-l-purple-500",
    kpis: [
      { label: "Beats", value: "0" },
      { label: "Platform", value: "In progress" },
    ],
    status: "development",
    alert: null,
  },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  testing: "bg-yellow-500/10 text-yellow-400",
  development: "bg-blue-500/10 text-blue-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}z`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [recentConvos, setRecentConvos] = useState<RecentConversation[]>([]);
  const [runningLoop, setRunningLoop] = useState(false);
  const [loopReport, setLoopReport] = useState<string | null>(null);
  const [runningPulse, setRunningPulse] = useState(false);
  const [pulsePhase, setPulsePhase] = useState<string | null>(null);
  const [pulseLog, setPulseLog] = useState<{ type: string; content: string; agentName?: string; agentEmoji?: string }[]>([]);
  const [pulseDone, setPulseDone] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setUsage(d.usage || null);
        setRecentConvos(d.recentConversations);
      })
      .catch(() => {});
  }, []);

  const runCompanyPulse = async () => {
    setRunningPulse(true);
    setPulseLog([]);
    setPulsePhase(null);
    setPulseDone(false);

    const res = await fetch("/api/autonomous/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: "all" }),
    });

    if (!res.body) { setRunningPulse(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.event === "phase") {
            setPulsePhase(`${ev.icon} ${ev.title}`);
            setPulseLog((prev) => [...prev, { type: "phase", content: `${ev.icon} ${ev.title}` }]);
          } else if (ev.event === "step_start") {
            setPulseLog((prev) => [...prev, { type: "step_start", content: "", agentName: ev.agentName, agentEmoji: ev.agentEmoji }]);
          } else if (ev.event === "text") {
            setPulseLog((prev) => {
              const last = prev[prev.length - 1];
              if (last?.type === "text" && last.agentName === ev.agentSlug) {
                return [...prev.slice(0, -1), { ...last, content: last.content + ev.content }];
              }
              return [...prev, { type: "text", content: ev.content, agentName: ev.agentSlug }];
            });
          } else if (ev.event === "tool_start") {
            setPulseLog((prev) => [...prev, { type: "tool", content: `Rulează ${ev.toolName}...` }]);
          } else if (ev.event === "tool_output") {
            setPulseLog((prev) => [...prev, { type: "tool_output", content: ev.output }]);
          } else if (ev.event === "saved") {
            setPulseLog((prev) => [...prev, { type: "saved", content: ev.message }]);
          } else if (ev.event === "pulse_end") {
            setPulseDone(true);
            setRunningPulse(false);
          } else if (ev.event === "error") {
            setPulseLog((prev) => [...prev, { type: "error", content: ev.message }]);
            setRunningPulse(false);
          }
        } catch {}
      }
    }
  };

  const runAnalyticsLoop = async () => {
    setRunningLoop(true);
    setLoopReport(null);
    try {
      const res = await fetch("/api/analytics/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug: "all" }),
      });
      const data = await res.json();
      setLoopReport(data.report || "");
      // Refresh stats after loop
      fetch("/api/dashboard").then((r) => r.json()).then((d) => setStats(d.stats)).catch(() => {});
    } catch {
      setLoopReport("Eroare la rularea loop-ului.");
    } finally {
      setRunningLoop(false);
    }
  };

  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalAgents = AGENTS.length;
  const departments = [...new Set(AGENTS.map((a) => a.department))].length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <h1 className="text-3xl font-bold mt-1">Company HQ</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalAgents} agenți activi în {departments} departamente
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/chat">
            <div className="p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <div>
                  <p className="font-semibold text-sm">Smart Chat</p>
                  <p className="text-xs text-muted-foreground">Rutare automată</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/chat">
            <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  🏛️
                </div>
                <div>
                  <p className="font-semibold text-sm">Board Meeting</p>
                  <p className="text-xs text-muted-foreground">Toți directorii</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-8">
          {[
            {
              icon: MessageSquare,
              label: "Conversații",
              value: stats?.conversations ?? "—",
              href: "/activity",
              color: "text-blue-400",
            },
            {
              icon: AlertTriangle,
              label: "Probleme",
              value: stats?.problems ?? "—",
              href: "/problems",
              color: stats?.problems ? "text-orange-400" : "text-muted-foreground",
            },
            {
              icon: Lightbulb,
              label: "Idei",
              value: stats?.ideas ?? "—",
              href: "/ideas",
              color: "text-yellow-400",
            },
            {
              icon: BookOpen,
              label: "Knowledge",
              value: stats?.knowledge ?? "—",
              href: "/knowledge",
              color: "text-green-400",
            },
            {
              icon: Brain,
              label: "Memorii",
              value: stats?.memories ?? "—",
              href: "/knowledge",
              color: "text-purple-400",
            },
            {
              icon: DollarSign,
              label: "Cost AI",
              value: usage ? `$${usage.costUsd.toFixed(3)}` : "—",
              href: "/settings",
              color: "text-emerald-400",
            },
          ].map((s) => (
            <Link key={s.label} href={s.href}>
              <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-accent transition-colors">
                <s.icon className={`h-4 w-4 mb-2 ${s.color}`} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Company Pulse */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              Company Pulse
              <span className="text-[10px] text-muted-foreground font-normal ml-1">loop autonom complet</span>
            </h2>
            <Button
              variant={runningPulse ? "outline" : "default"}
              size="sm"
              onClick={runCompanyPulse}
              disabled={runningPulse}
              className="h-8 text-xs"
            >
              {runningPulse ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              {runningPulse ? pulsePhase || "Se rulează..." : "Run Pulse"}
            </Button>
          </div>

          {pulseLog.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="max-h-96 overflow-y-auto p-4 space-y-2 text-sm">
                {pulseLog.map((entry, i) => {
                  if (entry.type === "phase") {
                    return (
                      <div key={i} className="flex items-center gap-2 pt-3 pb-1 border-t border-border first:border-0 first:pt-0">
                        <span className="font-semibold text-primary text-xs uppercase tracking-wide">{entry.content}</span>
                      </div>
                    );
                  }
                  if (entry.type === "step_start") {
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.agentEmoji}</span>
                        <span className="font-medium">{entry.agentName}</span>
                        <Loader2 className={`h-3 w-3 ${runningPulse ? "animate-spin" : "hidden"}`} />
                      </div>
                    );
                  }
                  if (entry.type === "text") {
                    return (
                      <div key={i} className="text-xs text-muted-foreground leading-relaxed pl-5 whitespace-pre-wrap">
                        {entry.content}
                      </div>
                    );
                  }
                  if (entry.type === "tool") {
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-yellow-400 pl-5">
                        <Wrench className="h-3 w-3" />
                        {entry.content}
                      </div>
                    );
                  }
                  if (entry.type === "tool_output") {
                    return (
                      <pre key={i} className="text-[10px] bg-muted/50 rounded p-2 pl-5 overflow-x-auto text-muted-foreground max-h-24 overflow-y-auto">
                        {entry.content}
                      </pre>
                    );
                  }
                  if (entry.type === "saved") {
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {entry.content}
                      </div>
                    );
                  }
                  if (entry.type === "error") {
                    return (
                      <div key={i} className="text-xs text-red-400 pl-5">{entry.content}</div>
                    );
                  }
                  return null;
                })}
                {pulseDone && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-green-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Company Pulse complet — raport salvat în Knowledge Base
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
              <Play className="h-8 w-8 mx-auto mb-2 text-primary opacity-40" />
              <p className="text-xs text-muted-foreground">
                COO face briefing → Sales analizează pipeline → Outreach execută → Analytics raportează → CEO decide.
                <br />Toți agenții citesc date reale și pot rula tools.
              </p>
            </div>
          )}
        </div>

        {/* Analytics Loop */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              Analytics Loop
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalyticsLoop}
              disabled={runningLoop}
              className="h-8 text-xs"
            >
              {runningLoop ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              {runningLoop ? "Analizez..." : "Run Loop"}
            </Button>
          </div>

          {loopReport ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-primary">Analytics Director — Raport generat • salvat în Knowledge Base</span>
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {loopReport}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <BarChart2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">
                Analytics Director analizează conversații, memorii și probleme → generează raport → salvează automat în Knowledge Base.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Business Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Afaceri Active
              </h2>
              <Link href="/strategy">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  Strategy <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {BUSINESSES.map((biz) => (
                <div
                  key={biz.slug}
                  className={`rounded-xl border border-border bg-card p-4 border-l-4 ${biz.color}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{biz.emoji}</span>
                      <div>
                        <p className="font-medium text-sm">{biz.name}</p>
                        <p className="text-xs text-muted-foreground">{biz.description}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${STATUS_COLORS[biz.status]}`}>
                      {biz.status}
                    </span>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {biz.kpis.map((kpi) => (
                      <div key={kpi.label}>
                        <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                        <p className="text-sm font-semibold">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                  {biz.alert && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-orange-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {biz.alert}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Conversations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Conversații Recente
              </h2>
              <Link href="/activity">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  Toate <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {recentConvos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-xs text-muted-foreground">Nicio conversație încă</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentConvos.map((conv) => (
                  <Link key={conv.id} href={`/chat/${conv.agent_slug}`}>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent transition-colors">
                      <span className="text-xl shrink-0 mt-0.5">{conv.agent_emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {conv.title || conv.agent_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{conv.agent_name}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {timeAgo(conv.updated_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Roster */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Echipa ({totalAgents} agenți)
            </h2>
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                Chat <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {AGENTS.filter((a) => a.level === "c-suite" || a.level === "director").map((agent) => (
              <Link key={agent.slug} href={`/chat/${agent.slug}`}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-accent transition-colors">
                  <span className="text-sm">{agent.emoji}</span>
                  <span className="text-xs font-medium">{agent.name}</span>
                  <Zap className="h-3 w-3 text-primary opacity-60" />
                </div>
              </Link>
            ))}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-border">
              <span className="text-xs text-muted-foreground">
                +{AGENTS.filter((a) => a.level === "lead" || a.level === "specialist").length} sub-agenți
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
