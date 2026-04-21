"use client";

import { Badge } from "@/components/ui/badge";
import { Settings, Key, Database, Server } from "lucide-react";

export default function SettingsPage() {
  const apiKeySet = false; // Will check .env
  const supabaseSet = false;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Configurare API keys și conexiuni.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Anthropic API Key</h3>
                <p className="text-xs text-muted-foreground">
                  Necesară pentru răspunsuri AI reale
                </p>
              </div>
              <Badge
                variant={apiKeySet ? "default" : "outline"}
                className="ml-auto"
              >
                {apiKeySet ? "Conectat" : "Mock Mode"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Setează <code className="text-xs bg-muted px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> în{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code> și{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">AI_MODE=live</code>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Supabase</h3>
                <p className="text-xs text-muted-foreground">
                  Persistență conversații, idei, probleme
                </p>
              </div>
              <Badge
                variant={supabaseSet ? "default" : "outline"}
                className="ml-auto"
              >
                {supabaseSet ? "Conectat" : "Local Only"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Setează <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> și{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> în{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>
            </p>
          </div>

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

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Status Sistem</h3>
                <p className="text-xs text-muted-foreground">
                  AI Company v0.1 — Mock Mode
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                v0.1
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
