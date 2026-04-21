"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

const STRATEGIES = [
  {
    business: "Site Hustle",
    title: "Conversie leads interested",
    status: "active",
    progress: 15,
    kpis: [
      { label: "Leads total", value: "1,030" },
      { label: "Contactate", value: "73" },
      { label: "Interested", value: "8" },
      { label: "Converted", value: "0" },
    ],
    alerts: ["8 leads interested necontactate — acțiune imediată"],
    color: "border-l-green-500",
  },
  {
    business: "AI Agency",
    title: "Primul client plătitor",
    status: "active",
    progress: 5,
    kpis: [
      { label: "Outreach trimis", value: "0" },
      { label: "Discovery calls", value: "0" },
      { label: "Clienți", value: "0" },
    ],
    alerts: ["Zero outreach trimis — blochează progresul"],
    color: "border-l-blue-500",
  },
  {
    business: "Car Selling",
    title: "Sistem automat OLX",
    status: "testing",
    progress: 40,
    kpis: [
      { label: "Tools ready", value: "8/8" },
      { label: "Teste reale", value: "0" },
    ],
    alerts: [],
    color: "border-l-orange-500",
  },
  {
    business: "Music",
    title: "Producție beats",
    status: "development",
    progress: 10,
    kpis: [
      { label: "Beats finalizate", value: "0" },
      { label: "Platform setup", value: "In progress" },
    ],
    alerts: [],
    color: "border-l-purple-500",
  },
];

export default function StrategyPage() {
  const [aiUpdate, setAiUpdate] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const getAiUpdate = async () => {
    setLoadingUpdate(true);
    setAiUpdate("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: "user",
            content: "Fă o analiză strategică completă a tuturor afacerilor acum. Ce e prioritar, ce blocaje există, ce acțiuni concrete recomandai pentru săptămâna asta?",
            timestamp: Date.now(),
          }],
          agentSlug: "ceo",
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
            if (data.type === "text" && data.content) {
              setAiUpdate((prev) => prev + data.content);
            }
          }
        }
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Strategy Board</h1>
            <p className="text-muted-foreground text-sm">Strategii active per afacere. KPIs și alerte.</p>
          </div>
          <Button variant="outline" onClick={getAiUpdate} disabled={loadingUpdate}>
            {loadingUpdate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            AI Update
          </Button>
        </div>

        {aiUpdate && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-primary">CEO — Analiză strategică</span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{aiUpdate}</div>
          </div>
        )}

        <div className="space-y-4">
          {STRATEGIES.map((strategy) => (
            <div key={strategy.title} className={`rounded-xl border border-border bg-card p-5 border-l-4 ${strategy.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">{strategy.business}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{strategy.status}</Badge>
                  </div>
                  <h3 className="font-semibold">{strategy.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  {strategy.progress}%
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${strategy.progress}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {strategy.kpis.map((kpi) => (
                  <div key={kpi.label}>
                    <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                    <p className="text-sm font-semibold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />{kpi.value}
                    </p>
                  </div>
                ))}
              </div>
              {strategy.alerts.length > 0 && (
                <div className="space-y-1">
                  {strategy.alerts.map((alert) => (
                    <div key={alert} className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 rounded-lg px-3 py-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />{alert}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
