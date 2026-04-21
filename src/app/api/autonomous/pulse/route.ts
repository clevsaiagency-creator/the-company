import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getAgent } from "@/lib/ai/agents";
import { getKnowledgeForAgent } from "@/lib/db/knowledge";
import { getMemoriesForPrompt, saveMemory } from "@/lib/db/memories";
import { createKnowledge } from "@/lib/db/knowledge";

// ─── Tool execution ──────────────────────────────────────────────────────────

const TOOLS_DIR = path.resolve(process.cwd(), "..", "tools");

async function runTool(script: string, args: string[] = []): Promise<string> {
  return new Promise((resolve) => {
    const toolPath = path.resolve(TOOLS_DIR, script);
    if (!fs.existsSync(toolPath)) {
      resolve(`[Eroare: tool ${script} nu există]`);
      return;
    }

    const lines: string[] = [];
    const proc = spawn("python", [toolPath, ...args], {
      cwd: TOOLS_DIR,
      env: { ...process.env },
    });

    proc.stdout.on("data", (d: Buffer) => lines.push(d.toString()));
    proc.stderr.on("data", (d: Buffer) => lines.push(`[stderr] ${d.toString()}`));
    proc.on("close", () => resolve(lines.join("").trim()));
    proc.on("error", (e: Error) => resolve(`[Eroare: ${e.message}]`));
    setTimeout(() => { proc.kill(); resolve(lines.join("").trim() || "[timeout]"); }, 30000);
  });
}

// ─── Extract tool calls and run them ────────────────────────────────────────

const TOOL_REGEX = /\[TOOL:\s*(.+?)\]/g;
const MEMORY_REGEX = /\[MEMORY:\s*(.+?)\]/g;

function extractAndStrip(text: string): { clean: string; toolCalls: { name: string; args: string[] }[]; memories: string[] } {
  const toolCalls: { name: string; args: string[] }[] = [];
  const memories: string[] = [];
  let m;

  const toolRegex = /\[TOOL:\s*(.+?)\]/g;
  while ((m = toolRegex.exec(text)) !== null) {
    const parts = m[1].trim().split(/\s+/);
    toolCalls.push({ name: parts[0], args: parts.slice(1) });
  }

  const memRegex = /\[MEMORY:\s*(.+?)\]/g;
  while ((m = memRegex.exec(text)) !== null) {
    memories.push(m[1].trim());
  }

  const clean = text.replace(TOOL_REGEX, "").replace(MEMORY_REGEX, "").trim();
  return { clean, toolCalls, memories };
}

// ─── Run one agent step ──────────────────────────────────────────────────────

async function runAgentStep(
  agentSlug: string,
  userPrompt: string,
  projectSlug: string,
  send: (event: string, data: object) => void
): Promise<string> {
  const agent = getAgent(agentSlug);
  if (!agent) return `[Agent ${agentSlug} negăsit]`;

  send("step_start", { agentSlug, agentName: agent.name, agentEmoji: agent.emoji });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelMap: Record<string, string> = {
    opus: "claude-opus-4-6",
    sonnet: "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5-20251001",
  };
  const model = modelMap[agent.model] || "claude-sonnet-4-6";

  // Build system prompt with KB + memories
  let system = agent.systemPrompt;
  try {
    const kb = await getKnowledgeForAgent(projectSlug);
    if (kb) system += `\n\n${kb}`;
  } catch {}
  try {
    const mem = await getMemoriesForPrompt(agentSlug, projectSlug);
    if (mem) system += `\n\n${mem}`;
  } catch {}

  // Available tools
  const availableTools = fs.existsSync(TOOLS_DIR)
    ? fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".py")).join(", ")
    : "";

  if (availableTools) {
    system += `\n\n=== TOOLS DISPONIBILE ===
Poți rula tools Python pentru a executa acțiuni reale. Adaugă la finalul răspunsului:
[TOOL: nume_script.py arg1 arg2]
Tools: ${availableTools}
Exemple:
- [TOOL: status.py] → statusul real al tuturor afacerilor
- [TOOL: check_leads_stats.py] → statistici leads
- [TOOL: list_necontactate.py] → leads necontactate
Folosește tools pentru a obține DATE REALE, nu să inventezi cifre.
=== END TOOLS ===

=== MEMORIE ===
Dacă afli ceva important, adaugă: [MEMORY: conținut]
=== END MEMORIE ===`;
  }

  let fullResponse = "";

  const stream = client.messages.stream({
    model,
    system,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 1024,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullResponse += event.delta.text;
      send("text", { agentSlug, content: event.delta.text });
    }
  }

  // Extract and run tool calls
  const { clean, toolCalls, memories } = extractAndStrip(fullResponse);

  for (const tool of toolCalls) {
    send("tool_start", { agentSlug, toolName: tool.name });
    const output = await runTool(tool.name, tool.args);
    send("tool_output", { agentSlug, toolName: tool.name, output });
    fullResponse += `\n\n[Rezultat ${tool.name}]:\n${output}`;
  }

  // Save memories
  for (const memory of memories) {
    try {
      await saveMemory({ agentSlug, projectSlug, content: memory, importance: "normal" });
    } catch {}
  }

  send("step_end", { agentSlug });
  return fullResponse;
}

// ─── Main pulse ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const isLive = process.env.AI_MODE === "live" && process.env.ANTHROPIC_API_KEY;
  const body = await request.json().catch(() => ({}));
  const projectSlug = body.projectSlug || "all";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: object) {
        const line = `data: ${JSON.stringify({ event, ...data })}\n\n`;
        controller.enqueue(encoder.encode(line));
      }

      send("pulse_start", { timestamp: new Date().toISOString() });

      if (!isLive) {
        send("error", { message: "AI_MODE=live și ANTHROPIC_API_KEY sunt necesare pentru Company Pulse." });
        send("pulse_end", {});
        controller.close();
        return;
      }

      try {
        // ── Step 1: Status real ──────────────────────────────────────────────
        send("phase", { title: "Status companie", icon: "📊" });
        const statusOutput = await runTool("status.py");
        send("raw_data", { label: "Status real", content: statusOutput });

        // ── Step 2: COO — Briefing zilnic ────────────────────────────────────
        send("phase", { title: "COO — Briefing zilnic", icon: "📋" });
        const cooPrompt = `Ești COO. Fă briefing-ul zilnic pentru Alex pe baza statusului real de mai jos.

=== STATUS REAL (generat acum) ===
${statusOutput}
=== END STATUS ===

Structurează briefing-ul:
1. Ce e cel mai important AZI (top 3 priorități)
2. Ce e blocat și trebuie deblocat
3. Ce acțiuni concrete trebuie să se întâmple azi
4. Orice problemă/risc de semnalat

Fii specific cu numere reale din status. Nu generaliza.
Dacă vrei mai multe date, folosește [TOOL: check_leads_stats.py] sau alte tools disponibile.`;

        const cooResponse = await runAgentStep("coo", cooPrompt, projectSlug, send);

        // ── Step 3: Sales Director — Pipeline real ───────────────────────────
        send("phase", { title: "Sales Director — Pipeline", icon: "💼" });
        const salesPrompt = `Ești Sales Director. Analizează pipeline-ul real și decide acțiunile de azi.

=== STATUS COMPANIE ===
${statusOutput}

=== BRIEFING COO ===
${cooResponse}
=== END ===

Răspunde cu:
1. Status pipeline (leads contactate, interested, convertite — numere reale)
2. Blocajul principal acum
3. Acțiunile concrete pentru azi (cu responsabil și deadline)
4. Câte mesaje outreach trebuie trimise azi și cui

Dacă ai nevoie de date mai detaliate despre leads, folosește [TOOL: list_necontactate.py] sau [TOOL: check_leads_stats.py].`;

        const salesResponse = await runAgentStep("sales-director", salesPrompt, projectSlug, send);

        // ── Step 4: Outreach Specialist — Acțiuni reale ──────────────────────
        send("phase", { title: "Outreach Specialist — Execuție", icon: "📤" });
        const outreachPrompt = `Ești Outreach Specialist. Sales Director a dat instrucțiunile de mai jos. Tu execuți.

=== INSTRUCȚIUNI SALES DIRECTOR ===
${salesResponse}
=== END ===

Pași:
1. Verifică câte leads necontactate avem azi cu [TOOL: list_necontactate.py]
2. Raportează exact câte mesaje poți trimite azi (max 25 WhatsApp/zi, anti-ban)
3. Descrie ce mesaj trimiți și cum îl personalizezi
4. Dacă trimiți efectiv astăzi — folosește [TOOL: send_whatsapp.js] cu argumentele corecte

Fii precis. Nu improviza cifre.`;

        const outreachResponse = await runAgentStep("outreach-specialist", outreachPrompt, projectSlug, send);

        // ── Step 5: Analytics — Raport loop ─────────────────────────────────
        send("phase", { title: "Analytics Director — Loop îmbunătățire", icon: "📊" });
        const analyticsPrompt = `Ești Analytics Director. Analizează activitatea de azi și raportează ce merge, ce nu, și ce schimbăm.

=== DATE REALE ===
${statusOutput}

=== ACȚIUNI ALE ECHIPEI AZI ===
COO: ${cooResponse.substring(0, 500)}...
Sales: ${salesResponse.substring(0, 500)}...
Outreach: ${outreachResponse.substring(0, 500)}...
=== END ===

Raportează:
1. Metricile cheie actuale (cu numere reale)
2. Ce trend observe (up/down pe fiecare metric)
3. Bottleneck-ul principal (un singur lucru care dacă se fixează, totul se îmbunătățește)
4. Recomandare concretă pentru echipă (ce să schimbe săptămâna aceasta)
5. Ce A/B test ar trebui să rulăm acum`;

        const analyticsResponse = await runAgentStep("analytics-director", analyticsPrompt, projectSlug, send);

        // ── Step 6: CEO — Decizie strategică ────────────────────────────────
        send("phase", { title: "CEO — Decizie strategică", icon: "🧠" });
        const ceoPrompt = `Ești CEO. Ai primit rapoartele complete ale echipei de azi. Ia deciziile strategice.

=== RAPOARTE ECHIPĂ ===
STATUS: ${statusOutput.substring(0, 300)}
COO: ${cooResponse.substring(0, 400)}
SALES: ${salesResponse.substring(0, 400)}
ANALYTICS: ${analyticsResponse.substring(0, 400)}
=== END ===

Răspunde cu:
1. Decizia strategică principală pentru această săptămână (un singur focus)
2. Ce schimbare faci față de săptămâna trecută
3. Resursa principală (timp/energie/bani) unde se concentrează acum
4. Ce agenți/departamente au nevoie de atenție imediată
5. Target-ul pe care îl urmărim în 7 zile (specific, măsurabil)`;

        const ceoResponse = await runAgentStep("ceo", ceoPrompt, projectSlug, send);

        // ── Salvăm raportul complet în KB ────────────────────────────────────
        send("phase", { title: "Salvare raport în Knowledge Base", icon: "💾" });

        const now = new Date().toLocaleDateString("ro-RO", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        });

        const fullReport = `# Company Pulse — ${now}

## Status Real
${statusOutput}

## COO — Briefing
${cooResponse}

## Sales Director — Pipeline
${salesResponse}

## Outreach Specialist — Execuție
${outreachResponse}

## Analytics Director — Loop
${analyticsResponse}

## CEO — Decizie strategică
${ceoResponse}`;

        try {
          await createKnowledge({
            title: `Company Pulse — ${now}`,
            content: fullReport,
            category: "metrics",
            project_slug: projectSlug,
          });
          send("saved", { message: `Raport salvat în Knowledge Base` });
        } catch (e) {
          send("save_error", { message: `Nu am putut salva în KB: ${String(e)}` });
        }

        send("pulse_end", {
          summary: {
            phases: 6,
            timestamp: new Date().toISOString(),
          }
        });
      } catch (err) {
        send("error", { message: String(err) });
        send("pulse_end", {});
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
