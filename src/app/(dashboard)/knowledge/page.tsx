"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  BookOpen,
  Search,
  Trash2,
  Pencil,
  X,
  Loader2,
  Brain,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject, PROJECTS } from "@/lib/project-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  project_slug: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface AgentMemory {
  id: string;
  agent_slug: string;
  project_slug: string;
  content: string;
  importance: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KB_CATEGORIES = [
  { value: "business", label: "Business Info", color: "bg-blue-500/10 text-blue-400" },
  { value: "clients", label: "Clienti & Leads", color: "bg-green-500/10 text-green-400" },
  { value: "processes", label: "Procese & SOPs", color: "bg-purple-500/10 text-purple-400" },
  { value: "preferences", label: "Preferinte", color: "bg-orange-500/10 text-orange-400" },
  { value: "metrics", label: "Metrici & KPIs", color: "bg-red-500/10 text-red-400" },
  { value: "general", label: "General", color: "bg-gray-500/10 text-gray-400" },
];

type TabMode = "knowledge" | "memories";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const { projectSlug } = useProject();
  const [tab, setTab] = useState<TabMode>("knowledge");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formProject, setFormProject] = useState("all");
  const [saving, setSaving] = useState(false);

  // ─── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [tab, projectSlug]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === "knowledge") {
        const res = await fetch(`/api/knowledge?project=${projectSlug}`);
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      } else {
        const res = await fetch(`/api/memories?project=${projectSlug}`);
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch {
      // Tables might not exist yet
      setEntries([]);
      setMemories([]);
    }
    setLoading(false);
  }

  // ─── Knowledge CRUD ───────────────────────────────────────────────────────

  function openNewForm() {
    setEditingId(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormProject(projectSlug);
    setShowForm(true);
  }

  function openEditForm(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormCategory(entry.category);
    setFormProject(entry.project_slug);
    setShowForm(true);
  }

  async function saveEntry() {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);

    if (editingId) {
      const res = await fetch(`/api/knowledge/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          project_slug: formProject,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? updated : e))
        );
      }
    } else {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          project_slug: formProject,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setEntries((prev) => [created, ...prev]);
      }
    }

    setShowForm(false);
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  async function deleteMemoryItem(id: string) {
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredMemories = memories.filter(
    (m) =>
      !search ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.agent_slug.toLowerCase().includes(search.toLowerCase())
  );

  // Group memories by agent
  const memoriesByAgent = filteredMemories.reduce(
    (acc, m) => {
      if (!acc[m.agent_slug]) acc[m.agent_slug] = [];
      acc[m.agent_slug].push(m);
      return acc;
    },
    {} as Record<string, AgentMemory[]>
  );

  const getCategoryInfo = (cat: string) =>
    KB_CATEGORIES.find((c) => c.value === cat) || KB_CATEGORIES[KB_CATEGORIES.length - 1];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Knowledge Base
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tot ce stie compania despre afacerea ta.
            </p>
          </div>
          {tab === "knowledge" && (
            <Button onClick={openNewForm} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adauga
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 mb-6">
          <button
            onClick={() => setTab("knowledge")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
              tab === "knowledge"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-4 w-4" />
            Knowledge Base
            {entries.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {entries.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setTab("memories")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
              tab === "memories"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Brain className="h-4 w-4" />
            Agent Memories
            {memories.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {memories.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cauta..."
              className="pl-9"
            />
          </div>
          {tab === "knowledge" && (
            <div className="relative">
              <select
                value={filterCategory || ""}
                onChange={(e) =>
                  setFilterCategory(e.target.value || null)
                }
                className="h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer"
              >
                <option value="">Toate categoriile</option>
                {KB_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="mb-6 p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {editingId ? "Editeaza" : "Adauga"} intrare
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Titlu..."
              />

              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Continut... (tot ce trebuie sa stie agentii despre asta)"
                rows={4}
              />

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Categorie
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {KB_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Proiect
                  </label>
                  <select
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {PROJECTS.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.emoji} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Anuleaza
                </Button>
                <Button
                  size="sm"
                  onClick={saveEntry}
                  disabled={!formTitle.trim() || !formContent.trim() || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {editingId ? "Salveaza" : "Adauga"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "knowledge" ? (
          /* ─── Knowledge Base List ─────────────────────────────────────── */
          filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-semibold mb-1">Knowledge Base gol</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Adauga informatii despre afacerea ta ca agentii sa lucreze informat.
              </p>
              <Button onClick={openNewForm} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Prima intrare
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const catInfo = getCategoryInfo(entry.category);
                const projectInfo = PROJECTS.find(
                  (p) => p.slug === entry.project_slug
                );
                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-medium text-sm">{entry.title}</h3>
                          <Badge
                            className={cn(
                              "text-[10px] h-5 border-0",
                              catInfo.color
                            )}
                          >
                            {catInfo.label}
                          </Badge>
                          {projectInfo && entry.project_slug !== "all" && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              {projectInfo.emoji} {projectInfo.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                          {entry.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-2">
                          Actualizat{" "}
                          {new Date(entry.updated_at).toLocaleDateString(
                            "ro-RO"
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => openEditForm(entry)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ─── Agent Memories List ─────────────────────────────────────── */
          filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-semibold mb-1">Nicio memorie</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Agentii isi salveaza automat lucruri importante din conversatii.
                Vorbeste cu ei si memoriile vor aparea aici.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(memoriesByAgent).map(([agentSlug, agentMems]) => (
                <div key={agentSlug}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5" />
                    {agentSlug}
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {agentMems.length}
                    </Badge>
                  </h3>
                  <div className="space-y-2">
                    {agentMems.map((mem) => (
                      <div
                        key={mem.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/60 group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{mem.content}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4",
                                mem.importance === "critical" &&
                                  "border-red-500/50 text-red-400",
                                mem.importance === "high" &&
                                  "border-orange-500/50 text-orange-400"
                              )}
                            >
                              {mem.importance}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/50">
                              {new Date(mem.created_at).toLocaleDateString(
                                "ro-RO"
                              )}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMemoryItem(mem.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
