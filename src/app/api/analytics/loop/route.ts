import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { createKnowledge } from "@/lib/db/knowledge";

async function getRecentActivity(projectSlug: string) {
  const [{ data: conversations }, { data: memories }, { data: problems }] = await Promise.all([
    supabase
      .from("conversations")
      .select("agent_slug, agent_name, title, updated_at, conversation_type")
      .eq("project_slug", projectSlug === "all" ? "all" : projectSlug)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("agent_memories")
      .select("agent_slug, content, importance, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("problems")
      .select("title, description, severity, status, business, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return { conversations: conversations || [], memories: memories || [], problems: problems || [] };
}

export async function POST(request: NextRequest) {
  const isLive = process.env.AI_MODE === "live" && process.env.ANTHROPIC_API_KEY;
  const body = await request.json().catch(() => ({}));
  const projectSlug = body.projectSlug || "all";

  const { conversations, memories, problems } = await getRecentActivity(projectSlug);

  // Build context for Analytics Director
  const conversationsSummary = conversations
    .map((c) => `- ${c.agent_name || c.agent_slug} (${c.conversation_type}): "${c.title || "fără titlu"}" — ${new Date(c.updated_at).toLocaleDateString("ro-RO")}`)
    .join("\n");

  const memoriesSummary = memories
    .map((m) => `- [${m.agent_slug}] (${m.importance}): ${m.content}`)
    .join("\n");

  const problemsSummary = problems
    .map((p) => `- [${p.severity}] ${p.title} (${p.business}, status: ${p.status})`)
    .join("\n");

  const analysisPrompt = `Ești Analytics Director. Analizează activitatea recentă a companiei AI și generează un raport de loop-ul de îmbunătățire.

=== CONVERSAȚII RECENTE (${conversations.length}) ===
${conversationsSummary || "Nicio conversație."}

=== MEMORII AGENȚI (${memories.length} cele mai recente) ===
${memoriesSummary || "Nicio memorie salvată."}

=== PROBLEME ACTIVE (${problems.length}) ===
${problemsSummary || "Nicio problemă."}

=== RAPORT CERUT ===
Generează un raport structurat cu:
1. **Ce departamente sunt active** — cine lucrează, cine e inactiv
2. **Pattern-uri identificate** — ce teme revin, ce probleme se repetă
3. **Ce merge bine** — activitate pozitivă detectată
4. **Ce trebuie îmbunătățit** — blocaje, agenți neinstruiți, lipsă date
5. **Recomandări concrete** — acțiuni specifice pentru săptămâna viitoare, per departament
6. **KPIs urmăriți** — ce metrici ar trebui monitorizate

Fii specific, concis și acționabil. Baza-te pe datele de mai sus, nu inventa.`;

  let reportContent = "";

  if (isLive) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      system: "Ești Analytics Director al AI Company — expert în analiză de date, identificare pattern-uri și recomandări acționabile bazate pe date reale.",
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 2048,
    });
    reportContent = response.content[0].type === "text" ? response.content[0].text : "";
  } else {
    // Mock report
    reportContent = `# Analytics Loop Report — ${new Date().toLocaleDateString("ro-RO")}

## 1. Departamente Active
- **COO/PA**: activ — briefing-uri generate
- **CEO**: activ — analize strategice
- **Sales Director**: moderat — pipeline tracking
- **Analytics Director**: activ (chiar acum!)

## 2. Pattern-uri Identificate
- Conversațiile CEO + Sales apar frecvent → focus pe vânzări, bine
- Lipsă conversații Marketing → CMO inactiv, nicio campanie lansată
- Probleme recurente: "zero outreach" apare în multiple memorii

## 3. Ce Merge Bine
- Site Hustle: 10 site-uri construite, 8 leads interested identificați
- Tool Runner integrat și funcțional
- Knowledge Base populat cu context business

## 4. Ce Trebuie Îmbunătățit
- CMO + Sub-agenți marketing: zero activitate
- Outreach AI Agency: nelansat
- Follow-up leads interested: manual, fără sistem

## 5. Recomandări Concrete
- **Sales Director**: Activați Deal Closer pe toți 8 leads interested AZI
- **CMO**: Creați calendar content pentru luna curentă
- **Backend Lead**: Automatizați follow-up leads cu script Python
- **Analytics**: Setați KPI tracking săptămânal automat

## 6. KPIs de Urmărit
- Leads contactate/zi: target 25
- Conversion interested→client: target 25%
- Conversații AI/zi: target 5+
- Probleme rezolvate/săptămână: target 80%`;
  }

  // Save report to Knowledge Base
  const reportDate = new Date().toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  try {
    await createKnowledge({
      category: "metrics",
      title: `Analytics Loop Report — ${reportDate}`,
      content: reportContent,
      project_slug: projectSlug,
      tags: ["analytics", "loop", "auto-generated"],
    });
  } catch {
    // Silent fail — still return the report
  }

  return NextResponse.json({ report: reportContent, savedAt: new Date().toISOString() });
}
