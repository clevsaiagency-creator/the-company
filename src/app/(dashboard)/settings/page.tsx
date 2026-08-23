"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Database, Server, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [status, setStatus] = useState<{
    anthropic: boolean;
    supabase: boolean;
    tables: Record<string, string>;
    version: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const loading = !status;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Configurare API keys și conexiuni.
        </p>

        <div className="space-y-4">
          {/* Anthropic */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Anthropic API Key</h3>
                <p className="text-xs text-muted-foreground">
                  Necesară pentru răspunsuri AI reale
                </p>
              </div>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
              ) : (
                <Badge
                  variant={status.anthropic ? "default" : "outline"}
                  className={`ml-auto ${status.anthropic ? "bg-green-600 hover:bg-green-600" : ""}`}
                >
                  {status.anthropic ? "Live Mode ✓" : "Mock Mode"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Setează <code className="text-xs bg-muted px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> în{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code> și{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">AI_MODE=live</code>
            </p>
          </div>

          {/* Supabase */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Supabase</h3>
                <p className="text-xs text-muted-foreground">
                  Persistență conversații, idei, probleme
                </p>
              </div>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
              ) : (
                <Badge
                  variant={status.supabase ? "default" : "outline"}
                  className={`ml-auto ${status.supabase ? "bg-green-600 hover:bg-green-600" : ""}`}
                >
                  {status.supabase ? "Conectat ✓" : "Eroare"}
                </Badge>
              )}
            </div>
            {status?.tables && (
              <div className="mt-2 space-y-1">
                {Object.entries(status.tables).map(([table, s]) => (
                  <p key={table} className="text-xs text-muted-foreground">
                    <span className={s === "OK" ? "text-green-500" : "text-red-400"}>
                      {s === "OK" ? "✓" : "✗"}
                    </span>{" "}
                    {table}: {s}
                  </p>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Setează <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> și{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> în{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>
            </p>
          </div>

          {/* Tool Runner */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Tool Runner</h3>
                <p className="text-xs text-muted-foreground">
                  Server local FastAPI pentru Python tools
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Neinstalat
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Va fi adăugat în Faza 7 — permite execuția scripturilor Python existente.
            </p>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Status Sistem</h3>
                <p className="text-xs text-muted-foreground">
                  {loading
                    ? "Se verifică..."
                    : `AI Company ${status.version} — ${status.anthropic ? "Live Mode" : "Mock Mode"}`}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {status?.version ?? "..."}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
