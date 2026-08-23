import { saveMemory } from "@/lib/db/memories";

const SEED_MEMORIES = [
  // ─── CEO ────────────────────────────────────────────────────────────────────
  {
    agentSlug: "ceo",
    projectSlug: "all",
    importance: "critical" as const,
    content:
      "Infrastructura AI Company e funcțională: Knowledge Base live (Supabase), memorie persistentă per agent, Tool Runner pentru scripturi Python. MCPs externe (Gmail, Meta, WhatsApp API) neimplementate încă.",
  },
  {
    agentSlug: "ceo",
    projectSlug: "all",
    importance: "critical" as const,
    content:
      "Alex are 5 afaceri active: Site Hustle (prioritate #1 cash flow), AI Agency (0 clienți, outreach în pregătire), Clevs AI Videos (0 useri plătitori), Trevvly (MVP spre vară), Car Selling + Music (side projects).",
  },
  {
    agentSlug: "ceo",
    projectSlug: "site-hustle",
    importance: "high" as const,
    content:
      "Site Hustle bottleneck: 8 persoane interested neconvertite. Aceasta e prioritatea #1. 1030 leads total, 108 contactate, 4 confirmed. Tool Runner poate trimite WhatsApp/email direct din chat.",
  },
  {
    agentSlug: "ceo",
    projectSlug: "ai-agency",
    importance: "high" as const,
    content:
      "AI Agency: 0 clienți. Produse definite: Auto Răspuns (voice agent €279-749/lună), Chatbot, Reminder programări, Abandoned Cart, Leads System. Partener cold calling (50/50). Nișe: medical, restaurante, e-commerce.",
  },
  {
    agentSlug: "ceo",
    projectSlug: "all",
    importance: "normal" as const,
    content:
      "Target financiar: €1.500/lună net până Decembrie 2026. Alex e solo founder, 18 ani, Timișoara. Fus orar EET.",
  },

  // ─── COO ────────────────────────────────────────────────────────────────────
  {
    agentSlug: "coo",
    projectSlug: "all",
    importance: "critical" as const,
    content:
      "Sistemul AI Company are KB live + memorie persistentă funcționale. Tool Runner activ: scripturi Python în /tools pot fi rulate direct cu [TOOL: script.py]. Briefing.md actualizat regulat cu starea reală.",
  },
  {
    agentSlug: "coo",
    projectSlug: "site-hustle",
    importance: "high" as const,
    content:
      "Operațional Site Hustle: outreach WhatsApp max 25-30/zi (anti-ban), email, Instagram DM. 8 interested neconvertite = blocaj principal. Tools disponibile: send_whatsapp.js, find_social_media.py.",
  },
  {
    agentSlug: "coo",
    projectSlug: "all",
    importance: "normal" as const,
    content:
      "Echipă: Orbean (dev Trevvly + Clevs AI Videos), Darian (backend Trevvly), Marcu (ads). AI Agency e solo Alex + partener anonim cold calling.",
  },

  // ─── CMO ────────────────────────────────────────────────────────────────────
  {
    agentSlug: "marketing-director",
    projectSlug: "all",
    importance: "critical" as const,
    content:
      "Regula canale outreach: WhatsApp rezervat EXCLUSIV pentru Site Hustle. AI Agency folosește email cold + Instagram DM (NU WhatsApp). Fiecare afacere are canal dedicat pentru a evita confuzia și ban.",
  },
  {
    agentSlug: "marketing-director",
    projectSlug: "site-hustle",
    importance: "high" as const,
    content:
      "Site Hustle marketing: 10+ site-uri demo deployate pe Vercel ca social proof. Preț vânzare €150-250. Conversion rate WhatsApp ~7.4% contact→interested. Video-uri demo pentru fiecare nișă = assets valoroase.",
  },
  {
    agentSlug: "marketing-director",
    projectSlug: "ai-agency",
    importance: "high" as const,
    content:
      "AI Agency marketing: conținut social media pe nișele medical + restaurante + e-commerce. Demo live e cel mai bun tool de vânzare. Alex e primul client al propriei agenții.",
  },

  // ─── Sales Director ─────────────────────────────────────────────────────────
  {
    agentSlug: "sales-director",
    projectSlug: "site-hustle",
    importance: "critical" as const,
    content:
      "Pipeline Site Hustle: 1030 leads total → 246 calificate → 108 contactate → 8 interested → 4 confirmed → 0 convertite. Bottleneck e la closing, nu la generare de leads.",
  },
  {
    agentSlug: "sales-director",
    projectSlug: "site-hustle",
    importance: "high" as const,
    content:
      "Tactică closing Site Hustle: offer frame = €200 one-time, hosted pe Vercel, livrare în 48h. Obiecția principală: preț. Counter: compară cu agenție (€500-2000). Demo live pe site-ul lor = cel mai bun closer.",
  },
  {
    agentSlug: "sales-director",
    projectSlug: "ai-agency",
    importance: "high" as const,
    content:
      "Sales AI Agency: discovery call → demo live → propunere → close. Pricing: Auto Răspuns Starter €279/lună + setup €950. Cut-off la 50% reducere setup pentru primii clienți.",
  },

  // ─── Analytics ──────────────────────────────────────────────────────────────
  {
    agentSlug: "analytics-director",
    projectSlug: "all",
    importance: "high" as const,
    content:
      "Metrici cheie de urmărit: Site Hustle (leads contactate/zi, conversion rate, interested→confirmed→paid), AI Agency (discovery calls/lună, close rate), Clevs AI Videos (useri activi, churn), costuri AI Company (tokens/lună).",
  },

  // ─── CTO ────────────────────────────────────────────────────────────────────
  {
    agentSlug: "cto",
    projectSlug: "all",
    importance: "high" as const,
    content:
      "Stack tehnic: Site Hustle = Next.js + Tailwind + Vercel. AI Agency = Vapi + n8n/Make + Twilio + PhantomBuster. Clevs AI Videos = n8n automations. Trevvly = Lovable frontend + custom backend. AI Company HQ = Next.js 16 + Supabase + Anthropic API.",
  },
  {
    agentSlug: "cto",
    projectSlug: "all",
    importance: "normal" as const,
    content:
      "AI Company Tool Runner: scripturi Python în /tools accesibile cu [TOOL: script.py]. Supabase: 7 tabele (conversations, messages, ideas, problems, videos, knowledge_base, agent_memories). Toate cu RLS permisive (anon key).",
  },
];

export async function POST() {
  const results = [];

  for (const mem of SEED_MEMORIES) {
    const saved = await saveMemory(mem);
    results.push({ agent: mem.agentSlug, project: mem.projectSlug, ok: !!saved });
  }

  const failed = results.filter((r) => !r.ok);
  return Response.json({
    seeded: results.length,
    failed: failed.length,
    results,
  });
}
