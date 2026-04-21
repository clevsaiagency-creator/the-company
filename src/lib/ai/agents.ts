import { CEO_PROMPT, COO_PROMPT } from "./prompts/executive";
import {
  CTO_PROMPT,
  FRONTEND_LEAD_PROMPT,
  DESIGN_SPECIALIST_PROMPT,
  COLORS_BRANDING_PROMPT,
  TYPOGRAPHY_PROMPT,
  UX_PROMPT,
  BACKEND_LEAD_PROMPT,
  API_SPECIALIST_PROMPT,
  DATABASE_SPECIALIST_PROMPT,
  INFRASTRUCTURE_PROMPT,
  SECURITY_PROMPT,
  SEO_PROMPT,
} from "./prompts/tech";
import {
  CMO_PROMPT,
  SCRIPT_WRITER_PROMPT,
  HOOK_SPECIALIST_PROMPT,
  CTA_SPECIALIST_PROMPT,
  STORY_SPECIALIST_PROMPT,
  TEMPLATE_CREATOR_PROMPT,
  ADS_MANAGER_PROMPT,
  SOCIAL_MEDIA_MANAGER_PROMPT,
  VIDEO_EDITOR_PROMPT,
  VIDEO_CREATOR_PROMPT,
  CONTENT_STRATEGIST_PROMPT,
} from "./prompts/marketing";
import {
  SALES_DIRECTOR_PROMPT,
  OUTREACH_SPECIALIST_PROMPT,
  LEAD_QUALIFIER_PROMPT,
  DEAL_CLOSER_PROMPT,
  ACCOUNT_MANAGER_PROMPT,
} from "./prompts/sales";
import {
  CFO_PROMPT,
  FINANCIAL_ANALYST_PROMPT,
  LEGAL_PROMPT,
  CONTRACT_SPECIALIST_PROMPT,
  COMPLIANCE_OFFICER_PROMPT,
  SUPPORT_PROMPT,
  SUPPORT_AGENT_PROMPT,
  ONBOARDING_SPECIALIST_PROMPT,
  ANALYTICS_DIRECTOR_PROMPT,
  DATA_SPECIALIST_PROMPT,
} from "./prompts/support-departments";

// ─── Agent Interface ──────────────────────────────────────────────────────────

export type AgentLevel = "c-suite" | "director" | "lead" | "specialist";

export interface Agent {
  slug: string;
  name: string;
  role: string;
  department: string;
  emoji: string;
  level: AgentLevel;
  parentSlug: string | null;
  model: "opus" | "sonnet" | "haiku";
  systemPrompt: string;
}

// ─── Context per proiect ────────────────────────────────────────────────────

export const PROJECT_FOCUS: Record<string, string> = {
  all: `
=== CONTEXT: Toate Afacerile lui Alex ===
Alex, 18 ani, antreprenor solo din Timișoara. Fus orar EET.

1. SITE HUSTLE — vânzare site-uri la €150-250 la business-uri mici fără site
   - 1030 leads total în CSV (Google Maps scraping Timișoara)
   - 125 contactate total | 108 calificate contactate | 8 interested | 0 convertite
   - 138 leads calificate cu telefon, necontactate încă
   - Status-uri în CSV: new / contacted / interested / not_interested / alternative / no_whatsapp / scos_are_site / scos_necalificat
   - 10+ site-uri demo construite și deployate pe Vercel
   - Outreach: WhatsApp principal (max 25-30/zi, anti-ban), email, Instagram DM
   - Conversion rate: ~7.4% contact → interested (8 din 108 calificate contactate)
   - Bottleneck: 8 interested neconvertiți, și volum outreach mic față de leads disponibile
   - Tools în Site hustle/tools/: send_whatsapp.js, check_leads_stats.py, list_necontactate.py, scrape_google_maps.py

2. AI AGENCY (Clevs AI) — voice agents + chatbots + automatizări pentru business-uri românești
   - Produse: Auto Răsp (voice agent 24/7 pe Vapi), Reminder (follow-up programări/cart), Leads (outreach automat)
   - Pricing: One-time 950€ | Starter 279€/lună | Business 529€/lună | Profesional 749€/lună
             Chatbot: 150€/lună standalone, +100€ add-on | Reminder: 80-180€/lună
   - Nișe active: Medical (clinici, dentare, vete), Restaurante, E-commerce
   - Outreach: email cold + DM Instagram (NU WhatsApp — rezervat Site Hustle)
   - Status: 0 clienți, strategie și pitch-uri definite, target luna 1 = 5 discovery calls, 1 client semnat
   - Partener pe cold calling (50/50 la clientul adus)
   - Site: clevs-ai.com | Tech: Vapi, n8n/Make, Twilio, PhantomBuster

3. CAR SELLING — sistem automat căutare + negociere mașini second-hand
   - Scraping OLX după criterii, outreach WhatsApp automat, rezultate în Google Sheet
   - Status: tools construite, 0 teste reale, comision per deal

4. MUSIC — producție și vânzare beats de înaltă calitate
   - FL Studio, vânzare pe BeatStars și platforme similare
   - Status: în development, 0 beats finalizate
`.trim(),

  "site-hustle": `
=== FOCUS EXCLUSIV: Site Hustle ===
Lucrezi DOAR pe Site Hustle. Ignoră celelalte afaceri.

SITE HUSTLE — vânzare site-uri la €150-250 la business-uri mici din Timișoara fără site bun

LEADS (date reale din CSV):
- Total leads: 1030
- Calificate (fără site bun + cu telefon): 246
- Contactate (calificate): 108
- Necontactate calificate cu telefon: 138
- Interested: 8 | Convertite: 0
- Conversion rate: ~7.4% contact → interested
- Status-uri posibile: new / contacted / interested / not_interested / alternative / no_whatsapp / scos_are_site / scos_necalificat / confirmed / rejected

SITUAȚIE ACTUALĂ:
- 8 leads interested neconvertiți — PRIORITATEA #1 (fiecare e €200 potențial)
- 138 leads necontactate calificate — volum disponibil pentru outreach
- Site-uri demo live pe Vercel pentru mai multe nișe (medical, restaurante, etc.)

OUTREACH:
- WhatsApp — principal, max 25-30 mesaje/zi, delay random 2-5 min anti-ban
- Email și Instagram DM — secundar
- Secvența: zi 1 → follow-up zi 3 → follow-up zi 7

TOOLS (Site hustle/tools/):
- send_whatsapp.js — trimite mesaje WA
- check_leads_stats.py — statistici detaliate
- list_necontactate.py — lista leads necontactate
- scrape_google_maps.py — scrape leads noi
- check_website_quality.py — verifică calitate site
- scrape_contact_page.py — extrage emailuri

Folder proiect: C:/Users/user/Desktop/Claude code/Site hustle/
`.trim(),

  "ai-agency": `
=== FOCUS EXCLUSIV: AI Agency (Clevs AI) ===
Lucrezi DOAR pe AI Agency. Ignoră celelalte afaceri.

AI AGENCY — vânzare sisteme AI automation la business-uri românești
Site: clevs-ai.com | Partener pe cold calling (50/50)

PRODUSE:
1. Auto Răsp (voice agent 24/7 pe Vapi) — preia apeluri, face programări, răspunde întrebări
2. Reminder — amintire programări, abandoned cart recovery, reducere retururi
3. Leads — outreach automat (cold calling, email, DM, scraping) — de construit

PRICING:
- Voice one-time: 950€ (client plătește Vapi direct 0.11€/min)
- Voice Starter: 279€/lună (1.000 min)
- Voice Business: 529€/lună (2.000 min)
- Voice Profesional: 749€/lună (3.000 min)
- Chatbot standalone: 150€/lună | Add-on la voice: +100€/lună
- Reminder: 80-180€/lună fix SAU per mesaj (75€/500, 130€/1k, 300€/2.5k)

NIȘE ACTIVE:
- Medical (clinici, dentare, estetice, veterinare) → Auto Răsp
- Restaurante → Auto Răsp
- E-commerce → Reminder + Chatbot

OUTREACH (activ):
- Canal: email cold + DM Instagram (NU WhatsApp — rezervat Site Hustle)
- CTA: discovery call 15 minute
- Secvență: zi 1 email → zi 3 DM → zi 7 follow-up
- Target luna 1: 5 discovery calls, 1 client semnat

STATUS: 0 clienți | Strategie definită | Pitch-uri create | Planuri active
TECH: Vapi, n8n/Make, Twilio, PhantomBuster, Claude Code
`.trim(),

  "car-selling": `
=== FOCUS EXCLUSIV: Car Selling ===
Lucrezi DOAR pe Car Selling. Ignoră celelalte afaceri.

CAR SELLING — sistem automat căutare și negociere mașini second-hand
- Caută mașini pe OLX după criterii (model, an, km, preț)
- Trimite mesaje automate pe WhatsApp pentru negociere
- Rezultatele în Google Sheet
- Status: tools construite, 0 teste reale
- Potențial: comision per deal închis
`.trim(),

  music: `
=== FOCUS EXCLUSIV: Music ===
Lucrezi DOAR pe Music. Ignoră celelalte afaceri.

MUSIC — producție și vânzare beats de înaltă calitate
- FL Studio pentru producție
- Vânzare pe platforme (BeatStars, etc.)
- Status: în development, 0 beats finalizate
- Obiectiv: beats care se vând pasiv
`.trim(),
};

// ─── Context comun ──────────────────────────────────────────────────────────

const BASE_CONTEXT = `
Alex, 18 ani, antreprenor din România. Fus orar EET.
Prioritatea #1: cash flow rapid din Site Hustle (site-uri €200).
`.trim();

// ─── Helper: prefix context la prompt ───────────────────────────────────────

function withContext(prompt: string): string {
  return `${BASE_CONTEXT}\n\n${prompt}`;
}

// ─── Toți agenții ───────────────────────────────────────────────────────────

export const AGENTS: Agent[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // EXECUTIVE (C-Suite)
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `ceo`,
    name: `CEO`,
    role: `Chief Executive Officer`,
    department: `executive`,
    emoji: `🧠`,
    level: `c-suite`,
    parentSlug: null,
    model: `opus`,
    systemPrompt: withContext(CEO_PROMPT),
  },
  {
    slug: `coo`,
    name: `COO / PA`,
    role: `Chief Operating Officer & Personal Assistant`,
    department: `executive`,
    emoji: `📋`,
    level: `c-suite`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(COO_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TECH (CTO → Leads → Specialists)
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `cto`,
    name: `CTO`,
    role: `Chief Technology Officer`,
    department: `tech`,
    emoji: `⚡`,
    level: `c-suite`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(CTO_PROMPT),
  },
  // ── Frontend ────────────────────────────────────────────────────────────
  {
    slug: `frontend-lead`,
    name: `Frontend Lead`,
    role: `Frontend Team Lead`,
    department: `tech`,
    emoji: `🎨`,
    level: `lead`,
    parentSlug: `cto`,
    model: `sonnet`,
    systemPrompt: withContext(FRONTEND_LEAD_PROMPT),
  },
  {
    slug: `design-specialist`,
    name: `Design Specialist`,
    role: `Visual Design Implementation`,
    department: `tech`,
    emoji: `🖌️`,
    level: `specialist`,
    parentSlug: `frontend-lead`,
    model: `haiku`,
    systemPrompt: withContext(DESIGN_SPECIALIST_PROMPT),
  },
  {
    slug: `colors-branding`,
    name: `Colors & Branding`,
    role: `Colors & Brand Identity Specialist`,
    department: `tech`,
    emoji: `🎨`,
    level: `specialist`,
    parentSlug: `frontend-lead`,
    model: `haiku`,
    systemPrompt: withContext(COLORS_BRANDING_PROMPT),
  },
  {
    slug: `typography`,
    name: `Typography`,
    role: `Font & Typography Specialist`,
    department: `tech`,
    emoji: `🔤`,
    level: `specialist`,
    parentSlug: `frontend-lead`,
    model: `haiku`,
    systemPrompt: withContext(TYPOGRAPHY_PROMPT),
  },
  {
    slug: `ux-specialist`,
    name: `UX Specialist`,
    role: `User Experience Specialist`,
    department: `tech`,
    emoji: `🧩`,
    level: `specialist`,
    parentSlug: `frontend-lead`,
    model: `haiku`,
    systemPrompt: withContext(UX_PROMPT),
  },
  // ── Backend ─────────────────────────────────────────────────────────────
  {
    slug: `backend-lead`,
    name: `Backend Lead`,
    role: `Backend Team Lead`,
    department: `tech`,
    emoji: `⚙️`,
    level: `lead`,
    parentSlug: `cto`,
    model: `sonnet`,
    systemPrompt: withContext(BACKEND_LEAD_PROMPT),
  },
  {
    slug: `api-specialist`,
    name: `API Specialist`,
    role: `API Design & Integration`,
    department: `tech`,
    emoji: `🔌`,
    level: `specialist`,
    parentSlug: `backend-lead`,
    model: `haiku`,
    systemPrompt: withContext(API_SPECIALIST_PROMPT),
  },
  {
    slug: `database-specialist`,
    name: `Database Specialist`,
    role: `Database Design & Optimization`,
    department: `tech`,
    emoji: `🗄️`,
    level: `specialist`,
    parentSlug: `backend-lead`,
    model: `haiku`,
    systemPrompt: withContext(DATABASE_SPECIALIST_PROMPT),
  },
  {
    slug: `infrastructure`,
    name: `Infrastructure`,
    role: `DevOps & Infrastructure`,
    department: `tech`,
    emoji: `☁️`,
    level: `specialist`,
    parentSlug: `backend-lead`,
    model: `haiku`,
    systemPrompt: withContext(INFRASTRUCTURE_PROMPT),
  },
  // ── Tech direct reports ─────────────────────────────────────────────────
  {
    slug: `security`,
    name: `Security`,
    role: `Security Specialist`,
    department: `tech`,
    emoji: `🔒`,
    level: `specialist`,
    parentSlug: `cto`,
    model: `haiku`,
    systemPrompt: withContext(SECURITY_PROMPT),
  },
  {
    slug: `seo-specialist`,
    name: `SEO Specialist`,
    role: `Search Engine Optimization`,
    department: `tech`,
    emoji: `🔍`,
    level: `specialist`,
    parentSlug: `cto`,
    model: `haiku`,
    systemPrompt: withContext(SEO_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MARKETING (CMO → Managers → Specialists)
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `cmo`,
    name: `CMO`,
    role: `Chief Marketing Officer`,
    department: `marketing`,
    emoji: `📢`,
    level: `c-suite`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(CMO_PROMPT),
  },
  // ── Script Writing team ─────────────────────────────────────────────────
  {
    slug: `script-writer`,
    name: `Script Writer`,
    role: `Copywriter Lead`,
    department: `marketing`,
    emoji: `✍️`,
    level: `lead`,
    parentSlug: `cmo`,
    model: `sonnet`,
    systemPrompt: withContext(SCRIPT_WRITER_PROMPT),
  },
  {
    slug: `hook-specialist`,
    name: `Hook Specialist`,
    role: `Hook & Attention Expert`,
    department: `marketing`,
    emoji: `🪝`,
    level: `specialist`,
    parentSlug: `script-writer`,
    model: `haiku`,
    systemPrompt: withContext(HOOK_SPECIALIST_PROMPT),
  },
  {
    slug: `cta-specialist`,
    name: `CTA Specialist`,
    role: `Call-to-Action Expert`,
    department: `marketing`,
    emoji: `🎯`,
    level: `specialist`,
    parentSlug: `script-writer`,
    model: `haiku`,
    systemPrompt: withContext(CTA_SPECIALIST_PROMPT),
  },
  {
    slug: `story-specialist`,
    name: `Story Specialist`,
    role: `Context & Storytelling Expert`,
    department: `marketing`,
    emoji: `📖`,
    level: `specialist`,
    parentSlug: `script-writer`,
    model: `haiku`,
    systemPrompt: withContext(STORY_SPECIALIST_PROMPT),
  },
  {
    slug: `template-creator`,
    name: `Template Creator`,
    role: `Variations & Template Builder`,
    department: `marketing`,
    emoji: `📋`,
    level: `specialist`,
    parentSlug: `script-writer`,
    model: `haiku`,
    systemPrompt: withContext(TEMPLATE_CREATOR_PROMPT),
  },
  // ── Marketing managers ──────────────────────────────────────────────────
  {
    slug: `ads-manager`,
    name: `Ads Manager`,
    role: `Paid Media Manager`,
    department: `marketing`,
    emoji: `💸`,
    level: `lead`,
    parentSlug: `cmo`,
    model: `sonnet`,
    systemPrompt: withContext(ADS_MANAGER_PROMPT),
  },
  {
    slug: `social-media-manager`,
    name: `Social Media Manager`,
    role: `Organic Social Media`,
    department: `marketing`,
    emoji: `📱`,
    level: `lead`,
    parentSlug: `cmo`,
    model: `sonnet`,
    systemPrompt: withContext(SOCIAL_MEDIA_MANAGER_PROMPT),
  },
  {
    slug: `video-editor`,
    name: `Video Editor`,
    role: `Post-Production Specialist`,
    department: `marketing`,
    emoji: `🎬`,
    level: `specialist`,
    parentSlug: `cmo`,
    model: `haiku`,
    systemPrompt: withContext(VIDEO_EDITOR_PROMPT),
  },
  {
    slug: `video-creator`,
    name: `Video Creator`,
    role: `Video Director & Producer`,
    department: `marketing`,
    emoji: `🎥`,
    level: `lead`,
    parentSlug: `cmo`,
    model: `sonnet`,
    systemPrompt: withContext(VIDEO_CREATOR_PROMPT),
  },
  {
    slug: `content-strategist`,
    name: `Content Strategist`,
    role: `Content Strategy & Planning`,
    department: `marketing`,
    emoji: `🗺️`,
    level: `lead`,
    parentSlug: `cmo`,
    model: `sonnet`,
    systemPrompt: withContext(CONTENT_STRATEGIST_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SALES
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `sales-director`,
    name: `Sales Director`,
    role: `Director Vânzări`,
    department: `sales`,
    emoji: `💼`,
    level: `director`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(SALES_DIRECTOR_PROMPT),
  },
  {
    slug: `outreach-specialist`,
    name: `Outreach Specialist`,
    role: `Cold Outreach & Follow-up`,
    department: `sales`,
    emoji: `📤`,
    level: `specialist`,
    parentSlug: `sales-director`,
    model: `sonnet`,
    systemPrompt: withContext(OUTREACH_SPECIALIST_PROMPT),
  },
  {
    slug: `lead-qualifier`,
    name: `Lead Qualifier`,
    role: `Lead Research & Scoring`,
    department: `sales`,
    emoji: `🔍`,
    level: `specialist`,
    parentSlug: `sales-director`,
    model: `haiku`,
    systemPrompt: withContext(LEAD_QUALIFIER_PROMPT),
  },
  {
    slug: `deal-closer`,
    name: `Deal Closer`,
    role: `Closing & Negotiation Specialist`,
    department: `sales`,
    emoji: `🤝`,
    level: `specialist`,
    parentSlug: `sales-director`,
    model: `sonnet`,
    systemPrompt: withContext(DEAL_CLOSER_PROMPT),
  },
  {
    slug: `account-manager`,
    name: `Account Manager`,
    role: `Client Retention & Upsell`,
    department: `sales`,
    emoji: `👤`,
    level: `specialist`,
    parentSlug: `sales-director`,
    model: `sonnet`,
    systemPrompt: withContext(ACCOUNT_MANAGER_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // FINANCE
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `cfo`,
    name: `CFO`,
    role: `Chief Financial Officer`,
    department: `finance`,
    emoji: `💰`,
    level: `c-suite`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(CFO_PROMPT),
  },
  {
    slug: `financial-analyst`,
    name: `Financial Analyst`,
    role: `Financial Modeling & Analysis`,
    department: `finance`,
    emoji: `📊`,
    level: `specialist`,
    parentSlug: `cfo`,
    model: `haiku`,
    systemPrompt: withContext(FINANCIAL_ANALYST_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LEGAL
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `legal-director`,
    name: `Legal Director`,
    role: `Legal & Compliance`,
    department: `legal`,
    emoji: `⚖️`,
    level: `director`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(LEGAL_PROMPT),
  },
  {
    slug: `contract-specialist`,
    name: `Contract Specialist`,
    role: `Contract Drafting & Review`,
    department: `legal`,
    emoji: `📝`,
    level: `specialist`,
    parentSlug: `legal-director`,
    model: `haiku`,
    systemPrompt: withContext(CONTRACT_SPECIALIST_PROMPT),
  },
  {
    slug: `compliance-officer`,
    name: `Compliance Officer`,
    role: `GDPR & Regulatory Compliance`,
    department: `legal`,
    emoji: `🛡️`,
    level: `specialist`,
    parentSlug: `legal-director`,
    model: `haiku`,
    systemPrompt: withContext(COMPLIANCE_OFFICER_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SUPPORT
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `support-director`,
    name: `Support Director`,
    role: `Customer Success & Support`,
    department: `support`,
    emoji: `🤝`,
    level: `director`,
    parentSlug: null,
    model: `haiku`,
    systemPrompt: withContext(SUPPORT_PROMPT),
  },
  {
    slug: `support-agent`,
    name: `Support Agent`,
    role: `Frontline Customer Support`,
    department: `support`,
    emoji: `💬`,
    level: `specialist`,
    parentSlug: `support-director`,
    model: `haiku`,
    systemPrompt: withContext(SUPPORT_AGENT_PROMPT),
  },
  {
    slug: `onboarding-specialist`,
    name: `Onboarding Specialist`,
    role: `Client Onboarding & First Value`,
    department: `support`,
    emoji: `🚀`,
    level: `specialist`,
    parentSlug: `support-director`,
    model: `haiku`,
    systemPrompt: withContext(ONBOARDING_SPECIALIST_PROMPT),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ════════════════════════════════════════════════════════════════════════════
  {
    slug: `analytics-director`,
    name: `Analytics Director`,
    role: `Data & Performance Analytics`,
    department: `analytics`,
    emoji: `📊`,
    level: `director`,
    parentSlug: null,
    model: `sonnet`,
    systemPrompt: withContext(ANALYTICS_DIRECTOR_PROMPT),
  },
  {
    slug: `data-specialist`,
    name: `Data Specialist`,
    role: `Data Collection & Quality`,
    department: `analytics`,
    emoji: `📈`,
    level: `specialist`,
    parentSlug: `analytics-director`,
    model: `haiku`,
    systemPrompt: withContext(DATA_SPECIALIST_PROMPT),
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getAgent(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

/** Returns all top-level agents (C-suite + directors) */
export function getDirectors(): Agent[] {
  return AGENTS.filter(
    (a) =>
      (a.level === `c-suite` || a.level === `director`) &&
      a.slug !== `coo`
  );
}

export function getDepartmentAgents(department: string): Agent[] {
  return AGENTS.filter((a) => a.department === department);
}

export function getSubAgents(parentSlug: string): Agent[] {
  return AGENTS.filter((a) => a.parentSlug === parentSlug);
}

/** Check if agent is a top-level agent (shown as "director" in UI) */
export function isTopLevel(agent: Agent): boolean {
  return agent.level === `c-suite` || agent.level === `director`;
}
