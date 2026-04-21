import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getAgent, getDirectors, getSubAgents, PROJECT_FOCUS, type Agent } from "./agents";
import { smartRoute, type RoutingResult } from "./router";
import { getKnowledgeForAgent } from "@/lib/db/knowledge";
import { getMemoriesForPrompt, saveMemory } from "@/lib/db/memories";

export interface Message {
  id: string;
  role: "user" | "agent" | "system";
  agentSlug?: string;
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  messages: Message[];
  agentSlug: string;
  conversationType: "one_on_one" | "department" | "board_meeting" | "brief" | "orchestrated";
  projectSlug?: string;
}

export interface StreamChunk {
  type:
    | "text"
    | "agent_start"
    | "agent_end"
    | "done"
    | "routing"
    | "delegation_start"
    | "delegation_end"
    | "lateral_start"
    | "lateral_end"
    | "tool_start"
    | "tool_output"
    | "tool_done"
    | "usage";
  agentSlug?: string;
  agentName?: string;
  agentEmoji?: string;
  content?: string;
  routingInfo?: {
    primaryAgent: string;
    primaryAgentName: string;
    primaryAgentEmoji: string;
    secondaryAgents: string[];
    confidence: string;
    method: string;
    delegationDepth: string;
  };
  parentAgentSlug?: string;
  delegationDepth?: number;
  toolName?: string;
  toolArgs?: string[];
  exitCode?: number;
  outputType?: "output" | "error";
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
}

// ─── No mock — live only ─────────────────────────────────────────────────────

function getMockResponse(agentSlug: string): string {
  const agent = getAgent(agentSlug);
  return `**${agent?.name || agentSlug} — MOCK MODE ACTIV**\n\nAplicația rulează fără API key. Setează \`ANTHROPIC_API_KEY\` și \`AI_MODE=live\` în \`.env.local\` pentru răspunsuri reale de la Claude.\n\nFără API key, agenții nu pot gândi sau răspunde la întrebările tale.`;
}

// ─── Tool execution helpers ──────────────────────────────────────────────────

function getAvailableTools(): string[] {
  try {
    const toolsDir = path.resolve(process.cwd(), "..", "tools");
    return fs.readdirSync(toolsDir).filter((f: string) => f.endsWith(".py")).sort();
  } catch {
    return [];
  }
}

const TOOL_REGEX = /\[TOOL:\s*(.+?)\]/g;

function extractTools(text: string): { cleanText: string; toolCalls: { name: string; args: string[] }[] } {
  const toolCalls: { name: string; args: string[] }[] = [];
  const regex = /\[TOOL:\s*(.+?)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const parts = match[1].trim().split(/\s+/);
    toolCalls.push({ name: parts[0], args: parts.slice(1) });
  }
  const cleanText = text.replace(TOOL_REGEX, "").trimEnd();
  return { cleanText, toolCalls };
}

async function runToolAndCollect(
  toolPath: string,
  args: string[],
  cwd: string
): Promise<{ lines: { type: "output" | "error"; content: string }[]; code: number }> {
  return new Promise((resolve) => {
    const lines: { type: "output" | "error"; content: string }[] = [];
    const proc = spawn("python", [toolPath, ...args], { cwd, env: { ...process.env } });

    proc.stdout.on("data", (data: Buffer) => {
      data.toString().split("\n").filter(Boolean).forEach((l) => {
        lines.push({ type: "output", content: l });
      });
    });
    proc.stderr.on("data", (data: Buffer) => {
      data.toString().split("\n").filter(Boolean).forEach((l) => {
        lines.push({ type: "error", content: l });
      });
    });
    proc.on("close", (code: number) => resolve({ lines, code: code ?? 0 }));
    proc.on("error", (err: Error) => {
      lines.push({ type: "error", content: err.message });
      resolve({ lines, code: 1 });
    });

    // 30s timeout
    setTimeout(() => {
      proc.kill();
      lines.push({ type: "error", content: "Tool timeout (30s)" });
      resolve({ lines, code: 1 });
    }, 30000);
  });
}

async function* streamToolExecutions(
  fullText: string,
  agentSlug: string
): AsyncGenerator<StreamChunk> {
  const { toolCalls } = extractTools(fullText);
  if (toolCalls.length === 0) return;

  const toolsDir = path.resolve(process.cwd(), "..", "tools");

  for (const tool of toolCalls) {
    yield { type: "tool_start", agentSlug, toolName: tool.name, toolArgs: tool.args };

    try {
      const toolPath = path.resolve(toolsDir, tool.name);
      // Security check
      if (!toolPath.startsWith(toolsDir) || !tool.name.endsWith(".py")) {
        yield { type: "tool_output", agentSlug, content: `Tool invalid: ${tool.name}`, outputType: "error" };
        yield { type: "tool_done", agentSlug, exitCode: 1 };
        continue;
      }
      if (!fs.existsSync(toolPath)) {
        yield { type: "tool_output", agentSlug, content: `Tool negăsit: ${tool.name}`, outputType: "error" };
        yield { type: "tool_done", agentSlug, exitCode: 1 };
        continue;
      }

      const result = await runToolAndCollect(toolPath, tool.args, toolsDir);
      for (const line of result.lines) {
        yield { type: "tool_output", agentSlug, content: line.content, outputType: line.type };
      }
      yield { type: "tool_done", agentSlug, exitCode: result.code };
    } catch (err) {
      yield { type: "tool_output", agentSlug, content: `Eroare: ${String(err)}`, outputType: "error" };
      yield { type: "tool_done", agentSlug, exitCode: 1 };
    }
  }
}

function getLiveContext(): string {
  try {
    const briefingPath = path.join(process.cwd(), "..", "BRIEFING.md");
    const briefing = fs.readFileSync(briefingPath, "utf-8");
    const now = new Date().toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `=== CONTEXT LIVE (${now}) ===\n${briefing}`;
  } catch {
    return "";
  }
}

async function buildSystemPrompt(agent: Agent, projectSlug: string): Promise<string> {
  const projectContext = PROJECT_FOCUS[projectSlug] || PROJECT_FOCUS["all"];
  let base = `${projectContext}\n\n${agent.systemPrompt}`;

  if (agent.slug === "coo" || agent.slug === "ceo") {
    const liveContext = getLiveContext();
    if (liveContext) {
      base = `${liveContext}\n\n${base}`;
    }
  }

  // Inject Knowledge Base context
  try {
    const kbContext = await getKnowledgeForAgent(projectSlug);
    if (kbContext) {
      base = `${base}\n\n${kbContext}`;
    }
  } catch {
    // KB not available (table missing) — continue without it
  }

  // Inject agent memories
  try {
    const memoriesContext = await getMemoriesForPrompt(agent.slug, projectSlug);
    if (memoriesContext) {
      base = `${base}\n\n${memoriesContext}`;
    }
  } catch {
    // Memories not available (table missing) — continue without it
  }

  // Inject available tools
  const availableTools = getAvailableTools();
  if (availableTools.length > 0) {
    base += `\n\n=== TOOLS DISPONIBILE ===
Poți rula orice tool Python din lista de mai jos adăugând la finalul răspunsului: [TOOL: nume_tool.py arg1 arg2]
Tools disponibile:
${availableTools.map((t) => `- ${t}`).join("\n")}
Exemplu: [TOOL: scrape_single_site.py https://example.com]
Folosește tools doar dacă utilizatorul cere explicit sau e clar că ai nevoie de date live. Tag-ul [TOOL:] nu e vizibil utilizatorului.
=== END TOOLS ===`;
  }

  // Memory save instruction
  base += `\n\n=== INSTRUCȚIUNE MEMORIE ===
Dacă în conversația asta afli ceva important pe care trebuie să-l reții pentru sesiuni viitoare (o decizie, un rezultat, o preferință, un fapt nou despre afacere), adaugă la SFÂRȘITUL răspunsului tău:
[MEMORY: conținutul memoriei]
Folosește asta doar pentru informații cu adevărat importante. Nu salva lucruri triviale.
Tag-ul [MEMORY:] NU va fi vizibil utilizatorului.
=== END INSTRUCȚIUNE ===`;

  return base;
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export async function* streamChat(
  request: ChatRequest
): AsyncGenerator<StreamChunk> {
  const isLive = process.env.AI_MODE === "live" && process.env.ANTHROPIC_API_KEY;
  const projectSlug = request.projectSlug || "all";

  if (request.conversationType === "board_meeting") {
    yield* streamBoardMeeting(request, !!isLive, projectSlug);
    return;
  }

  if (request.conversationType === "orchestrated") {
    yield* streamOrchestrated(request, !!isLive, projectSlug);
    return;
  }

  const agent = getAgent(request.agentSlug);
  if (!agent) {
    yield { type: "text", content: "Agent necunoscut." };
    yield { type: "done" };
    return;
  }

  yield {
    type: "agent_start",
    agentSlug: agent.slug,
    agentName: agent.name,
    agentEmoji: agent.emoji,
  };

  let fullResponse = "";

  if (isLive) {
    for await (const chunk of streamLiveResponse(agent, request.messages, projectSlug)) {
      if (chunk.type === "text" && chunk.content) {
        fullResponse += chunk.content;
      }
      yield chunk;
    }
  } else {
    fullResponse = getMockResponse(agent.slug);
    const words = fullResponse.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  yield { type: "agent_end", agentSlug: agent.slug };

  // Execute any tools the agent requested
  for await (const chunk of streamToolExecutions(fullResponse, agent.slug)) {
    yield chunk;
  }

  // Extract and save memories
  await processAgentResponse(fullResponse, agent.slug, projectSlug);

  yield { type: "done" };
}

async function* streamBoardMeeting(
  request: ChatRequest,
  isLive: boolean,
  projectSlug: string
): AsyncGenerator<StreamChunk> {
  const directors = getDirectors();
  const userMessage = request.messages[request.messages.length - 1]?.content || "";
  const previousResponses: { agent: string; content: string }[] = [];

  for (const director of directors) {
    yield {
      type: "agent_start",
      agentSlug: director.slug,
      agentName: director.name,
      agentEmoji: director.emoji,
    };

    let response: string;
    if (isLive) {
      response = "";
      for await (const chunk of streamLiveResponse(director, [
        ...request.messages,
        ...previousResponses.map((r) => ({
          id: crypto.randomUUID(),
          role: "agent" as const,
          agentSlug: r.agent,
          content: r.content,
          timestamp: Date.now(),
        })),
      ], projectSlug)) {
        if (chunk.type === "text" && chunk.content) {
          response += chunk.content;
          yield chunk;
        }
      }
    } else {
      response = getMockResponse(director.slug);
      const words = response.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    // Extract and save memories from response
    const cleanResponse = await processAgentResponse(response, director.slug, projectSlug);
    previousResponses.push({ agent: director.slug, content: cleanResponse });
    yield { type: "agent_end", agentSlug: director.slug };
    await new Promise((r) => setTimeout(r, 300));
  }

  yield { type: "done" };
}

// ─── Cost calculation ─────────────────────────────────────────────────────────

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6":              { input: 0.000015,  output: 0.000075  },
  "claude-sonnet-4-6":            { input: 0.000003,  output: 0.000015  },
  "claude-haiku-4-5-20251001":    { input: 0.0000008, output: 0.000004  },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_COSTS[model] || MODEL_COSTS["claude-sonnet-4-6"];
  return parseFloat((inputTokens * rates.input + outputTokens * rates.output).toFixed(6));
}

async function* streamLiveResponse(
  agent: Agent,
  messages: Message[],
  projectSlug: string
): AsyncGenerator<StreamChunk> {
  const systemPrompt = await buildSystemPrompt(agent, projectSlug);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const modelMap: Record<string, string> = {
    opus: "claude-opus-4-6",
    sonnet: "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5-20251001",
  };
  const model = modelMap[agent.model] || "claude-sonnet-4-6";

  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "agent")
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const stream = client.messages.stream({
    model,
    system: systemPrompt,
    messages: anthropicMessages,
    max_tokens: 1024,
  });

  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (event.type === "message_start" && event.message.usage) {
      inputTokens = event.message.usage.input_tokens;
    }
    if (event.type === "message_delta" && event.usage) {
      outputTokens = event.usage.output_tokens;
    }
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { type: "text", content: event.delta.text };
    }
  }

  if (inputTokens > 0 || outputTokens > 0) {
    yield {
      type: "usage",
      usage: {
        inputTokens,
        outputTokens,
        costUsd: calculateCost(model, inputTokens, outputTokens),
      },
    };
  }
}

// ─── Memory extraction ─────────────────────────────────────────────────────

const MEMORY_REGEX = /\[MEMORY:\s*(.+?)\]/g;

function extractMemories(text: string): { cleanText: string; memories: string[] } {
  const memories: string[] = [];
  let match;
  while ((match = MEMORY_REGEX.exec(text)) !== null) {
    memories.push(match[1].trim());
  }
  const cleanText = text.replace(MEMORY_REGEX, "").trimEnd();
  return { cleanText, memories };
}

async function saveExtractedMemories(
  agentSlug: string,
  projectSlug: string,
  memories: string[]
): Promise<void> {
  for (const content of memories) {
    try {
      await saveMemory({
        agentSlug,
        projectSlug,
        content,
        importance: "normal",
      });
    } catch {
      // Silent fail — memory saving shouldn't break the flow
    }
  }
}

/** Post-process a complete agent response: strip [MEMORY:] tags and save them */
async function processAgentResponse(
  fullText: string,
  agentSlug: string,
  projectSlug: string
): Promise<string> {
  const { cleanText, memories } = extractMemories(fullText);
  if (memories.length > 0) {
    // Fire and forget — don't block the stream
    saveExtractedMemories(agentSlug, projectSlug, memories);
  }
  return cleanText;
}

// ─── Mock delegation plans ──────────────────────────────────────────────────

const MOCK_DELEGATION_PLANS: Record<string, string[]> = {
  cto: ["frontend-lead", "backend-lead"],
  cmo: ["script-writer", "social-media-manager"],
  "sales-director": ["outreach-specialist", "lead-qualifier"],
  "analytics-director": ["data-specialist"],
};

const MOCK_SUMMARIES: Record<string, string> = {
  cto: `Am primit rapoartele de la echipa tech. Rezumat:

**Frontend Lead** se ocupă de implementare vizuală și structură.
**Backend Lead** gestionează logica server-side și integrările.

Proiectul e fezabil. Estimez 2-3 ore pentru build + deploy. Te țin la curent cu progresul.`,

  cmo: `Am analizat input-ul echipei de marketing:

**Script Writer** a pregătit mesajele și copy-ul.
**Social Media Manager** are planul de distribuție.

Strategia e aliniată. Lansăm conform calendarului propus.`,

  "sales-director": `Pipeline update pe baza rapoartelor echipei:

**Outreach Specialist** a raportat pe mesajele trimise și reply-uri.
**Lead Qualifier** a calificat batch-ul curent.

Acțiunile sunt clare. Continuăm execuția.`,

  "analytics-director": `Raport consolidat:

**Data Specialist** a colectat și verificat datele.

Numerele sunt actualizate. Recomandările sunt incluse mai sus.`,
};

// ─── Delegation prompt for live mode ────────────────────────────────────────

const DELEGATION_PLAN_PROMPT = `Analizează cererea utilizatorului și decide dacă ai nevoie de echipa ta pentru a răspunde.

Echipa ta directă:
{TEAM_LIST}

Dacă poți răspunde singur (întrebare generală, status, opinie), răspunde cu:
{"delegates": []}

Dacă ai nevoie de specialiști, răspunde DOAR cu JSON valid:
{"delegates": [{"slug": "agent-slug", "task": "ce trebuie să facă"}]}

IMPORTANT: Răspunde DOAR cu JSON, nimic altceva.`;

function buildDelegationPrompt(directorSlug: string): string {
  const subAgents = getSubAgents(directorSlug);
  if (subAgents.length === 0) return "";

  const teamList = subAgents
    .map((a) => `- ${a.slug}: ${a.name} — ${a.role}`)
    .join("\n");

  return DELEGATION_PLAN_PROMPT.replace("{TEAM_LIST}", teamList);
}

interface DelegationPlan {
  delegates: { slug: string; task: string }[];
}

async function getDelegationPlan(
  director: Agent,
  userMessage: string,
  projectSlug: string
): Promise<DelegationPlan> {
  const delegationPrompt = buildDelegationPrompt(director.slug);
  if (!delegationPrompt) return { delegates: [] };

  const systemPrompt = `${await buildSystemPrompt(director, projectSlug)}\n\n${delegationPrompt}`;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const modelMap: Record<string, string> = {
    opus: "claude-opus-4-6",
    sonnet: "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5-20251001",
  };

  const response = await client.messages.create({
    model: modelMap[director.model] || "claude-sonnet-4-6",
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 300,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { delegates: [] };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return { delegates: parsed.delegates || [] };
  } catch {
    return { delegates: [] };
  }
}

// ─── Orchestrated streaming ─────────────────────────────────────────────────

async function* streamOrchestrated(
  request: ChatRequest,
  isLive: boolean,
  projectSlug: string
): AsyncGenerator<StreamChunk> {
  const userMessage = request.messages[request.messages.length - 1]?.content || "";

  // Step 1: Route
  const apiKey = isLive ? process.env.ANTHROPIC_API_KEY : undefined;
  const routing = await smartRoute(userMessage, apiKey);

  const primaryAgent = getAgent(routing.primaryAgent);
  if (!primaryAgent) {
    yield { type: "text", content: "Nu am găsit agentul potrivit." };
    yield { type: "done" };
    return;
  }

  // Emit routing info
  yield {
    type: "routing",
    routingInfo: {
      primaryAgent: routing.primaryAgent,
      primaryAgentName: primaryAgent.name,
      primaryAgentEmoji: primaryAgent.emoji,
      secondaryAgents: routing.secondaryAgents,
      confidence: routing.confidence,
      method: routing.routingMethod,
      delegationDepth: routing.delegationDepth,
    },
  };

  // Step 2: Run primary agent
  if (routing.delegationDepth === "deep") {
    yield* streamWithDelegation(primaryAgent, request, isLive, projectSlug);
  } else {
    // Shallow — just run the agent directly
    yield {
      type: "agent_start",
      agentSlug: primaryAgent.slug,
      agentName: primaryAgent.name,
      agentEmoji: primaryAgent.emoji,
    };

    if (isLive) {
      yield* streamLiveResponse(primaryAgent, request.messages, projectSlug);
    } else {
      const response = getMockResponse(primaryAgent.slug);
      const words = response.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    yield { type: "agent_end", agentSlug: primaryAgent.slug };
  }

  // Step 3: Run secondary agents (cross-department)
  for (const secondarySlug of routing.secondaryAgents) {
    const secondaryAgent = getAgent(secondarySlug);
    if (!secondaryAgent) continue;

    if (routing.delegationDepth === "deep") {
      yield* streamWithDelegation(secondaryAgent, request, isLive, projectSlug);
    } else {
      yield {
        type: "agent_start",
        agentSlug: secondaryAgent.slug,
        agentName: secondaryAgent.name,
        agentEmoji: secondaryAgent.emoji,
      };

      if (isLive) {
        yield* streamLiveResponse(secondaryAgent, request.messages, projectSlug);
      } else {
        const response = getMockResponse(secondaryAgent.slug);
        const words = response.split(" ");
        for (let i = 0; i < words.length; i++) {
          yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      yield { type: "agent_end", agentSlug: secondaryAgent.slug };
    }
  }

  yield { type: "done" };
}

// ─── Deep delegation: director → sub-agents → director summary ─────────────

async function* streamWithDelegation(
  director: Agent,
  request: ChatRequest,
  isLive: boolean,
  projectSlug: string
): AsyncGenerator<StreamChunk> {
  const userMessage = request.messages[request.messages.length - 1]?.content || "";

  // Emit delegation start
  yield {
    type: "delegation_start",
    agentSlug: director.slug,
    agentName: director.name,
    agentEmoji: director.emoji,
  };

  // Step 1: Director's initial response
  yield {
    type: "agent_start",
    agentSlug: director.slug,
    agentName: director.name,
    agentEmoji: director.emoji,
  };

  let directorResponse = "";

  if (isLive) {
    for await (const chunk of streamLiveResponse(director, request.messages, projectSlug)) {
      if (chunk.type === "text" && chunk.content) {
        directorResponse += chunk.content;
        yield chunk;
      }
    }
  } else {
    directorResponse = getMockResponse(director.slug);
    const words = directorResponse.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  // Extract director memories
  directorResponse = await processAgentResponse(directorResponse, director.slug, projectSlug);

  yield { type: "agent_end", agentSlug: director.slug };

  // Step 2: Get delegation plan
  let delegateSlugs: { slug: string; task: string }[] = [];

  if (isLive) {
    const plan = await getDelegationPlan(director, userMessage, projectSlug);
    delegateSlugs = plan.delegates;
  } else {
    // Mock: use predefined delegation plans
    const mockDelegates = MOCK_DELEGATION_PLANS[director.slug] || [];
    delegateSlugs = mockDelegates.map((slug) => ({ slug, task: userMessage }));
  }

  // Step 3: Run each delegate
  const delegateResponses: { agent: string; content: string }[] = [];

  for (const delegate of delegateSlugs) {
    const delegateAgent = getAgent(delegate.slug);
    if (!delegateAgent) continue;

    yield {
      type: "agent_start",
      agentSlug: delegateAgent.slug,
      agentName: delegateAgent.name,
      agentEmoji: delegateAgent.emoji,
      parentAgentSlug: director.slug,
      delegationDepth: 1,
    };

    let delegateContent = "";

    if (isLive) {
      // Give delegate the specific task from the director
      const delegateMessages: Message[] = [
        ...request.messages,
        {
          id: crypto.randomUUID(),
          role: "agent" as const,
          agentSlug: director.slug,
          content: `[Instrucțiune de la ${director.name}]: ${delegate.task}`,
          timestamp: Date.now(),
        },
      ];

      for await (const chunk of streamLiveResponse(delegateAgent, delegateMessages, projectSlug)) {
        if (chunk.type === "text" && chunk.content) {
          delegateContent += chunk.content;
          yield chunk;
        }
      }
    } else {
      delegateContent = getMockResponse(delegateAgent.slug);
      const words = delegateContent.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    // Extract delegate memories
    delegateContent = await processAgentResponse(delegateContent, delegateAgent.slug, projectSlug);
    delegateResponses.push({ agent: delegateAgent.slug, content: delegateContent });
    yield { type: "agent_end", agentSlug: delegateAgent.slug };
    await new Promise((r) => setTimeout(r, 200));
  }

  // Step 3.5: Lateral communication (debate between delegates on same level)
  if (delegateResponses.length >= 2) {
    yield {
      type: "lateral_start",
      content: `Echipa dezbate...`,
    };

    // Each delegate reviews the others' responses and can refine
    for (let i = 0; i < delegateResponses.length; i++) {
      const reviewer = getAgent(delegateResponses[i].agent);
      if (!reviewer) continue;

      // Build context: all other delegates' responses
      const othersContext = delegateResponses
        .filter((_, j) => j !== i)
        .map((r) => {
          const otherAgent = getAgent(r.agent);
          return `[${otherAgent?.name || r.agent}]: ${r.content}`;
        })
        .join("\n\n");

      yield {
        type: "agent_start",
        agentSlug: reviewer.slug,
        agentName: `${reviewer.name} — Reacție`,
        agentEmoji: reviewer.emoji,
        parentAgentSlug: director.slug,
        delegationDepth: 1,
      };

      let reactionContent = "";

      if (isLive) {
        const reactionMessages: Message[] = [
          ...request.messages,
          {
            id: crypto.randomUUID(),
            role: "agent" as const,
            agentSlug: reviewer.slug,
            content: delegateResponses[i].content,
            timestamp: Date.now(),
          },
          {
            id: crypto.randomUUID(),
            role: "user" as const,
            content: `Colegii tăi au răspuns astfel:\n\n${othersContext}\n\nAi ceva de adăugat, corectat sau completat? Răspunde SCURT — doar dacă ai ceva relevant. Dacă ești de acord, confirmă pe scurt.`,
            timestamp: Date.now(),
          },
        ];

        for await (const chunk of streamLiveResponse(reviewer, reactionMessages, projectSlug)) {
          if (chunk.type === "text" && chunk.content) {
            reactionContent += chunk.content;
            yield chunk;
          }
        }
      } else {
        reactionContent = `De acord cu abordarea. Am un singur punct de adăugat din perspectiva mea de ${reviewer.role}.`;
        const words = reactionContent.split(" ");
        for (let w = 0; w < words.length; w++) {
          yield { type: "text", content: (w > 0 ? " " : "") + words[w] };
          await new Promise((r) => setTimeout(r, 15));
        }
      }

      // Update the delegate's response with reaction appended
      reactionContent = await processAgentResponse(reactionContent, reviewer.slug, projectSlug);
      delegateResponses[i].content += `\n\n[Reacție după dezbatere]: ${reactionContent}`;
      yield { type: "agent_end", agentSlug: reviewer.slug };
      await new Promise((r) => setTimeout(r, 150));
    }

    yield { type: "lateral_end" };
  }

  // Step 4: Director summary (only if there were delegates)
  if (delegateResponses.length > 0) {
    yield {
      type: "agent_start",
      agentSlug: director.slug,
      agentName: `${director.name} — Rezumat`,
      agentEmoji: director.emoji,
    };

    if (isLive) {
      const summaryMessages: Message[] = [
        ...request.messages,
        ...delegateResponses.map((r) => ({
          id: crypto.randomUUID(),
          role: "agent" as const,
          agentSlug: r.agent,
          content: r.content,
          timestamp: Date.now(),
        })),
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content: `Ai primit rapoartele echipei tale. Fă un rezumat executiv cu concluziile și acțiunile recomandate.`,
          timestamp: Date.now(),
        },
      ];

      for await (const chunk of streamLiveResponse(director, summaryMessages, projectSlug)) {
        if (chunk.type === "text") yield chunk;
      }
    } else {
      const summary = MOCK_SUMMARIES[director.slug] || `Rezumat complet de la ${director.name}. Echipa a raportat, acțiunile sunt clare.`;
      const words = summary.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield { type: "text", content: (i > 0 ? " " : "") + words[i] };
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    yield { type: "agent_end", agentSlug: director.slug };
  }

  // Emit delegation end
  yield {
    type: "delegation_end",
    agentSlug: director.slug,
  };
}

export { buildSystemPrompt };
