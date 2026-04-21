import type { Message } from "./orchestrator";
import { getAgent, getSubAgents, AGENTS, type Agent } from "./agents";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoutingResult {
  primaryAgent: string;
  secondaryAgents: string[];
  delegationDepth: "shallow" | "deep";
  crossDepartment: boolean;
  confidence: "high" | "medium" | "low";
  routingMethod: "keyword" | "llm";
}

interface RoutingRule {
  patterns: string[];
  department: string;
  entryAgent: string;
  /** If true, this rule triggers deep delegation (director → sub-agents) */
  deepTriggers?: string[];
}

// ─── Routing Rules ──────────────────────────────────────────────────────────

const ROUTING_RULES: RoutingRule[] = [
  {
    patterns: [
      "site", "build", "landing page", "frontend", "design", "backend",
      "api", "database", "deploy", "vercel", "code", "bug", "error",
      "security", "seo", "infrastructure", "server",
    ],
    department: "tech",
    entryAgent: "cto",
    deepTriggers: ["build", "site", "landing page", "deploy", "design"],
  },
  {
    patterns: [
      "marketing", "campaign", "ads", "content", "social media", "hook",
      "script", "video", "reel", "tiktok", "instagram", "post",
      "copywriting", "cta", "story", "brand",
    ],
    department: "marketing",
    entryAgent: "cmo",
    deepTriggers: ["script", "campaign", "video", "content", "hook"],
  },
  {
    patterns: [
      "leads", "outreach", "sales", "close", "pipeline", "deal",
      "prospect", "cold", "email", "whatsapp", "follow-up", "conversion",
    ],
    department: "sales",
    entryAgent: "sales-director",
    deepTriggers: ["outreach", "leads", "pipeline", "prospect"],
  },
  {
    patterns: [
      "budget", "cost", "revenue", "profit", "pricing", "financiar",
      "cashflow", "cheltuieli", "venituri", "bani",
    ],
    department: "finance",
    entryAgent: "cfo",
  },
  {
    patterns: [
      "legal", "contract", "gdpr", "compliance", "termeni", "juridic",
    ],
    department: "legal",
    entryAgent: "legal-director",
  },
  {
    patterns: [
      "analytics", "data", "metrics", "raport", "conversion rate",
      "statistici", "performance", "kpi",
    ],
    department: "analytics",
    entryAgent: "analytics-director",
    deepTriggers: ["data", "raport", "metrics"],
  },
  {
    patterns: [
      "support", "client", "onboarding", "ticket", "customer",
      "reclamație", "feedback",
    ],
    department: "support",
    entryAgent: "support-director",
  },
  {
    patterns: [
      "strategy", "priority", "plan", "focus", "direcție", "viziune",
      "business", "company", "companie",
    ],
    department: "executive",
    entryAgent: "ceo",
  },
  {
    patterns: [
      "schedule", "program", "azi", "today", "calendar", "briefing",
      "status", "update", "ce urmează", "taskuri",
    ],
    department: "executive",
    entryAgent: "coo",
  },
];

// ─── Keyword Router ─────────────────────────────────────────────────────────

interface RuleMatch {
  rule: RoutingRule;
  hitCount: number;
  deepHits: number;
}

function matchKeywords(message: string): RuleMatch[] {
  const lower = message.toLowerCase();
  const matches: RuleMatch[] = [];

  for (const rule of ROUTING_RULES) {
    let hitCount = 0;
    let deepHits = 0;

    for (const pattern of rule.patterns) {
      if (lower.includes(pattern)) {
        hitCount++;
      }
    }

    if (hitCount > 0 && rule.deepTriggers) {
      for (const trigger of rule.deepTriggers) {
        if (lower.includes(trigger)) {
          deepHits++;
        }
      }
    }

    if (hitCount > 0) {
      matches.push({ rule, hitCount, deepHits });
    }
  }

  // Sort by hit count descending
  matches.sort((a, b) => b.hitCount - a.hitCount);
  return matches;
}

export function routeMessage(userMessage: string): RoutingResult {
  const matches = matchKeywords(userMessage);

  // No matches → default to CEO
  if (matches.length === 0) {
    return {
      primaryAgent: "ceo",
      secondaryAgents: [],
      delegationDepth: "shallow",
      crossDepartment: false,
      confidence: "low",
      routingMethod: "keyword",
    };
  }

  const primary = matches[0];
  const secondaryAgents: string[] = [];
  let crossDepartment = false;

  // Check for cross-department (second match from different department)
  if (matches.length > 1 && matches[1].hitCount >= 2) {
    if (matches[1].rule.department !== primary.rule.department) {
      secondaryAgents.push(matches[1].rule.entryAgent);
      crossDepartment = true;
    }
  }

  // Determine confidence
  let confidence: "high" | "medium" | "low";
  if (primary.hitCount >= 3) {
    confidence = "high";
  } else if (primary.hitCount >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Determine delegation depth
  const delegationDepth = primary.deepHits > 0 ? "deep" : "shallow";

  return {
    primaryAgent: primary.rule.entryAgent,
    secondaryAgents,
    delegationDepth,
    crossDepartment,
    confidence,
    routingMethod: "keyword",
  };
}

// ─── LLM Router (for ambiguous cases — Phase 2.1) ──────────────────────────

const ROUTER_SYSTEM_PROMPT = `Ești un router inteligent. Analizezi mesajul utilizatorului și decizi care departament/agent trebuie activat.

Departamente disponibile:
- ceo: strategie, direcție business, decizii la nivel înalt
- coo: operațiuni zilnice, programare, status, briefing
- cto: tech, development, site-uri, cod, deploy, security, SEO
- cmo: marketing, content, social media, ads, video, copywriting
- sales-director: vânzări, outreach, leads, pipeline, closing
- cfo: finanțe, costuri, venituri, pricing, buget
- legal-director: legal, contracte, GDPR, compliance
- analytics-director: analiză date, metrici, rapoarte, KPI
- support-director: support clienți, onboarding, ticketing

Răspunde DOAR cu JSON valid:
{
  "primaryAgent": "slug-ul agentului principal",
  "secondaryAgents": ["slug-uri opționale"],
  "delegationNeeded": true/false
}`;

export async function routeMessageWithLLM(
  userMessage: string,
  apiKey: string
): Promise<RoutingResult> {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      system: ROUTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: 200,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      primaryAgent: parsed.primaryAgent || "ceo",
      secondaryAgents: parsed.secondaryAgents || [],
      delegationDepth: parsed.delegationNeeded ? "deep" : "shallow",
      crossDepartment: (parsed.secondaryAgents || []).length > 0,
      confidence: "high",
      routingMethod: "llm",
    };
  } catch {
    // Fallback to CEO on any error
    return {
      primaryAgent: "ceo",
      secondaryAgents: [],
      delegationDepth: "shallow",
      crossDepartment: false,
      confidence: "low",
      routingMethod: "keyword",
    };
  }
}

// ─── Smart Router (hybrid) ──────────────────────────────────────────────────

export async function smartRoute(
  userMessage: string,
  apiKey?: string
): Promise<RoutingResult> {
  const keywordResult = routeMessage(userMessage);

  // High confidence keyword match → use it
  if (keywordResult.confidence === "high") {
    return keywordResult;
  }

  // Medium confidence → use keyword result (good enough for MVP)
  if (keywordResult.confidence === "medium") {
    return keywordResult;
  }

  // Low confidence + API key available → try LLM
  if (keywordResult.confidence === "low" && apiKey) {
    return routeMessageWithLLM(userMessage, apiKey);
  }

  // Fallback
  return keywordResult;
}
