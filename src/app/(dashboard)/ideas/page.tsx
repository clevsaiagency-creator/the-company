"use client";

import { useState, useEffect } from "react";
import { Plus, Lightbulb, Tag, X, Loader2, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getIdeas, createIdea, updateIdeaAnalysis, deleteIdea } from "@/lib/db/ideas";
import type { DbIdea } from "@/lib/supabase";

const CATEGORIES = ["Product", "Marketing", "Operations", "Strategy", "Content", "Tech"];
const BUSINESSES = ["Site Hustle", "AI Agency", "Car Selling", "Music", "General"];

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [business, setBusiness] = useState("General");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    getIdeas().then((data) => {
      setIdeas(data);
      setLoading(false);
    });
  }, []);

  const addIdea = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const idea = await createIdea({ title: title.trim(), description: description.trim(), category, business });
    if (idea) {
      setIdeas((prev) => [idea, ...prev]);
      setTitle("");
      setDescription("");
      setShowForm(false);
    }
    setSaving(false);
  };

  const analyzeIdea = async (idea: DbIdea) => {
    setAnalyzing(idea.id);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: "user",
            content: `Analizează această idee și propune next steps concrete:\n\nTitlu: ${idea.title}\nDescriere: ${idea.description}\nCategorie: ${idea.category}\nAfacere: ${idea.business}`,
            timestamp: Date.now(),
          }],
          agentSlug: "ceo",
          conversationType: "one_on_one",
        }),
      });

      let analysis = "";
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));
            if (data.type === "text" && data.content) analysis += data.content;
          }
        }
      }

      await updateIdeaAnalysis(idea.id, analysis);
      setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, analysis, status: "analyzed" } : i));
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteIdea(id);
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Idea Vault</h1>
            <p className="text-muted-foreground text-sm">
              Captează idei rapid. AI-ul le analizează și propune next steps.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? "Anulează" : "Idee nouă"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6 space-y-4">
            <Input
              placeholder="Titlu idee..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
              autoFocus
            />
            <Textarea
              placeholder="Descrie ideea (opțional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-0.5 rounded text-xs ${category === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {BUSINESSES.map((biz) => (
                <button
                  key={biz}
                  onClick={() => setBusiness(biz)}
                  className={`px-2 py-0.5 rounded text-xs ${business === biz ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {biz}
                </button>
              ))}
            </div>
            <Button onClick={addIdea} disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvează Ideea
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : ideas.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nicio idee încă. Apasă &quot;Idee nouă&quot; pentru a adăuga prima.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div key={idea.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{idea.title}</h3>
                    {idea.description && (
                      <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{idea.status}</Badge>
                    <button onClick={() => handleDelete(idea.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">{idea.category}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{idea.business}</Badge>
                </div>
                {idea.analysis && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{idea.analysis}</div>
                )}
                {idea.status === "new" && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => analyzeIdea(idea)} disabled={analyzing === idea.id}>
                    {analyzing === idea.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Analizează cu AI
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
