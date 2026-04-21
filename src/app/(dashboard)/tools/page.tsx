"use client";

import { useState, useEffect } from "react";
import { Play, Terminal, Wrench, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ToolsPage() {
  const [tools, setTools] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [args, setArgs] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ type: string; content: string }[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  const fetchTools = async () => {
    setLoadingTools(true);
    try {
      const res = await fetch("/api/tools/list");
      const data = await res.json();
      setTools(data.tools || []);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => { fetchTools(); }, []);

  const runTool = async () => {
    if (!selectedTool) return;
    setRunning(true);
    setOutput([]);

    try {
      const response = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: selectedTool,
          args: args.trim() ? args.trim().split(" ") : [],
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "done") {
            setOutput((prev) => [...prev, { type: "system", content: `[Gata — exit code: ${data.code}]` }]);
          } else {
            setOutput((prev) => [...prev, { type: data.type, content: data.content }]);
          }
        }
      }
    } catch (err) {
      setOutput((prev) => [...prev, { type: "error", content: String(err) }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Tool Runner</h1>
          <p className="text-muted-foreground text-sm">
            Rulează scripts Python din The Company/tools/ direct din UI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tool list */}
          <div className="md:col-span-1">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Tools disponibile
                </h2>
                <button onClick={fetchTools} className="text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTools ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingTools ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : tools.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">
                    Niciun tool găsit.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adaugă .py scripts în
                  </p>
                  <code className="text-[10px] bg-muted px-1 rounded">The Company/tools/</code>
                </div>
              ) : (
                <div className="space-y-1">
                  {tools.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => { setSelectedTool(tool); setOutput([]); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTool === tool
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Run panel */}
          <div className="md:col-span-2 space-y-4">
            {selectedTool ? (
              <>
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedTool}</Badge>
                  </div>
                  <Input
                    placeholder="Argumente (opțional, space-separated)..."
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !running && runTool()}
                  />
                  <Button onClick={runTool} disabled={running}>
                    {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    {running ? "Rulează..." : "Rulează"}
                  </Button>
                </div>

                {output.length > 0 && (
                  <div className="rounded-xl border border-border bg-black/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-400 font-mono">Output</span>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="font-mono text-xs space-y-0.5">
                        {output.map((line, i) => (
                          <div
                            key={i}
                            className={
                              line.type === "error" ? "text-red-400" :
                              line.type === "system" ? "text-yellow-400" :
                              "text-green-300"
                            }
                          >
                            {line.content}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Selectează un tool din stânga pentru a-l rula.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
