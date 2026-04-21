"use client";

import { useState, useEffect } from "react";
import { Plus, AlertTriangle, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getProblems, createProblem, updateProblemSolutions, updateProblemStatus } from "@/lib/db/problems";
import type { DbProblem } from "@/lib/supabase";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  high: "bg-orange-500/10 text-orange-400",
  critical: "bg-red-500/10 text-red-400",
};

export default function ProblemsPage() {
  const [problems, setProblems] = useState<DbProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [business, setBusiness] = useState("General");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    getProblems().then((data) => {
      setProblems(data);
      setLoading(false);
    });
  }, []);

  const addProblem = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const problem = await createProblem({ title: title.trim(), description: description.trim(), business, severity });
    if (problem) {
      setProblems((prev) => [problem, ...prev]);
      setTitle("");
      setDescription("");
      setShowForm(false);
    }
    setSaving(false);
  };

  const analyzeProblem = async (problem: DbProblem) => {
    setAnalyzing(problem.id);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: "user",
            content: `Analizează această problemă și propune soluții concrete:\n\nTitlu: ${problem.title}\nDescriere: ${problem.description}\nBusiness: ${problem.business}\nSeveritate: ${problem.severity}`,
            timestamp: Date.now(),
          }],
          agentSlug: "ceo",
          conversationType: "one_on_one",
        }),
      });

      let solutions = "";
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));
            if (data.type === "text" && data.content) solutions += data.content;
          }
        }
      }

      await updateProblemSolutions(problem.id, solutions);
      setProblems((prev) => prev.map((p) => p.id === problem.id ? { ...p, solutions, status: "solution_proposed" } : p));
    } finally {
      setAnalyzing(null);
    }
  };

  const markResolved = async (id: string) => {
    await updateProblemStatus(id, "resolved");
    setProblems((prev) => prev.map((p) => p.id === id ? { ...p, status: "resolved" } : p));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Problem Tracker</h1>
            <p className="text-muted-foreground text-sm">Înregistrează probleme. AI-ul propune soluții.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? "Anulează" : "Problemă nouă"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6 space-y-4">
            <Input placeholder="Titlu problemă..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Textarea placeholder="Descrie problema..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <div className="flex gap-2">
              {(["low", "medium", "high", "critical"] as const).map((s) => (
                <button key={s} onClick={() => setSeverity(s)}
                  className={`px-3 py-1 rounded text-xs capitalize ${severity === s ? SEVERITY_COLORS[s] : "bg-muted text-muted-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {["General", "Site Hustle", "AI Agency", "Car Selling", "Music"].map((b) => (
                <button key={b} onClick={() => setBusiness(b)}
                  className={`px-2 py-0.5 rounded text-xs ${business === b ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {b}
                </button>
              ))}
            </div>
            <Button onClick={addProblem} disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Adaugă
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : problems.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nicio problemă înregistrată. Sper să rămână așa.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {problems.map((problem) => (
              <div key={problem.id} className={`rounded-xl border border-border bg-card p-4 ${problem.status === "resolved" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{problem.title}</h3>
                  <div className="flex gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${SEVERITY_COLORS[problem.severity] || "bg-muted text-muted-foreground"}`}>{problem.severity}</span>
                    <Badge variant="outline" className="text-[10px]">{problem.status}</Badge>
                  </div>
                </div>
                {problem.description && <p className="text-sm text-muted-foreground mt-1">{problem.description}</p>}
                {problem.solutions && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{problem.solutions}</div>
                )}
                <div className="flex gap-2 mt-3">
                  {problem.status === "open" && (
                    <Button variant="outline" size="sm" onClick={() => analyzeProblem(problem)} disabled={analyzing === problem.id}>
                      {analyzing === problem.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Analizează
                    </Button>
                  )}
                  {problem.status === "solution_proposed" && (
                    <Button variant="outline" size="sm" onClick={() => markResolved(problem.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Rezolvat
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
