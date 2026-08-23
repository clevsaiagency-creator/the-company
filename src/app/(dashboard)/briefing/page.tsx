"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, RefreshCw, Loader2 } from "lucide-react";
import { useProject } from "@/lib/project-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BriefingData {
  type: "morning" | "evening";
  content: string;
  generatedAt: string;
}

interface KBStat {
  id: string;
  title: string;
  content: string;
}

export default function BriefingPage() {
  const { projectSlug } = useProject();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [briefingType, setBriefingType] = useState<"morning" | "evening">(
    new Date().getHours() < 15 ? "morning" : "evening"
  );
  const [kbStats, setKbStats] = useState<KBStat[]>([]);

  useEffect(() => {
    fetch(`/api/knowledge?category=metrics&project=${projectSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setKbStats(data.slice(0, 4));
      })
      .catch(() => {});
  }, [projectSlug]);

  const generateBriefing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              content:
                briefingType === "morning"
                  ? "Generează briefing-ul de dimineață. Include: programul zilei cu slot-uri școală, priorități clare, ce fac eu vs ce face AI-ul, și acțiuni urgente."
                  : "Generează raportul de seară. Include: ce s-a realizat azi, ce a blocat, ce urmează mâine.",
              timestamp: Date.now(),
            },
          ],
          agentSlug: "coo",
          conversationType: "brief",
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "text" && data.content) {
            content += data.content;
            setBriefing({
              type: briefingType,
              content,
              generatedAt: new Date().toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            });
          }
        }
      }
    } catch {
      setBriefing({
        type: briefingType,
        content: "Eroare la generarea briefing-ului. Încearcă din nou.",
        generatedAt: new Date().toLocaleTimeString("ro-RO"),
      });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">{today}</p>
          <h1 className="text-3xl font-bold">
            {briefingType === "morning"
              ? "Bună dimineața, Alex"
              : "Raport de seară"}
          </h1>
        </div>

        {/* Toggle morning/evening */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={briefingType === "morning" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setBriefingType("morning");
              setBriefing(null);
            }}
          >
            <Sun className="h-4 w-4 mr-1" />
            Dimineață
          </Button>
          <Button
            variant={briefingType === "evening" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setBriefingType("evening");
              setBriefing(null);
            }}
          >
            <Moon className="h-4 w-4 mr-1" />
            Seară
          </Button>
        </div>

        {/* Briefing content */}
        {!briefing ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <span className="text-5xl mb-4 block">
              {briefingType === "morning" ? "☀️" : "🌙"}
            </span>
            <p className="text-muted-foreground mb-6">
              {briefingType === "morning"
                ? "Generează briefing-ul de dimineață pentru a vedea programul și prioritățile tale."
                : "Generează raportul de seară pentru a vedea ce s-a realizat azi."}
            </p>
            <Button onClick={generateBriefing} disabled={loading} size="lg">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generează Briefing
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {briefing.type === "morning" ? "Dimineață" : "Seară"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Generat la {briefing.generatedAt}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateBriefing}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
                />
                Regenerează
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                {briefing.content}
              </div>
            </div>
          </div>
        )}

        {/* Quick stats — din Knowledge Base */}
        {kbStats.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {kbStats.map((stat) => (
              <div
                key={stat.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-sm font-medium mt-1 line-clamp-3 leading-snug">
                  {stat.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Adaugă date în{" "}
              <a href="/knowledge" className="underline underline-offset-4 hover:text-foreground">
                Knowledge Base
              </a>{" "}
              pentru a vedea statistici live aici.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
