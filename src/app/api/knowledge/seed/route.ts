import { upsertKnowledge } from "@/lib/db/knowledge";

const SEED_DATA = [
  {
    title: "Pipeline Site Hustle",
    category: "metrics",
    project_slug: "site-hustle",
    content: "Leads total: 1.030 | Calificate: 246 | Contactate: 108 | Interested: 8 | Confirmed: 4 | Convertite: 0 | Revenue: €0",
  },
  {
    title: "Sites Construite",
    category: "metrics",
    project_slug: "site-hustle",
    content: "10+ site-uri demo deployate pe Vercel. Preț vânzare: €150-250/buc.",
  },
  {
    title: "Outreach Site Hustle",
    category: "processes",
    project_slug: "site-hustle",
    content: "Canal principal: WhatsApp (max 25-30/zi, anti-ban). Canale secundare: email, Instagram DM. Conversion rate: ~7.4% contact→interested. Bottleneck: closing — 8 oameni interesați neconvertiți.",
  },
  {
    title: "AI Agency — Produse & Pricing",
    category: "business",
    project_slug: "ai-agency",
    content: "Auto Răsp (voice agent): setup €950 one-time, Starter €279/lună (1.000 min), Business €529/lună (2.000 min), Pro €749/lună (3.000 min). Chatbot: €150/lună standalone, +€100 add-on. Reminder programări: mesaje €80/lună, mesaje+apeluri €150/lună. Abandoned cart: €100-180/lună. Leads System: Starter €350, Business €650, Pro €1.200/lună.",
  },
  {
    title: "AI Agency — Status",
    category: "metrics",
    project_slug: "ai-agency",
    content: "Clienți activi: 0. Discovery calls: 0. Strategie și pitch-uri definite. Partener cold calling (50/50 split). Site live: clevs-ai.com. Tech stack gata: Vapi, n8n/Make, Twilio, PhantomBuster.",
  },
  {
    title: "AI Agency — Nișe țintă",
    category: "business",
    project_slug: "ai-agency",
    content: "Nișa 1: Medical (clinici, dentare, estetice, veterinare) — voice agent + chatbot programări. Nișa 2: Restaurante — voice agent + chatbot rezervări. Nișa 3: E-commerce — cart recovery + retur scăzut + chatbot. Outreach: email cold + Instagram DM. NU WhatsApp (rezervat Site Hustle).",
  },
  {
    title: "Clevs AI Videos — Status",
    category: "metrics",
    project_slug: "clevs-videos",
    content: "SaaS generator UGC video-uri, automatizat prin n8n. Features: generare video + generare poze (nou). Useri plătitori: 0. Site: clevs-ai.online.",
  },
  {
    title: "Trevvly — Status",
    category: "metrics",
    project_slug: "trevvly",
    content: "App mobilă travel: planificator de călătorii + Tinder pentru călători. Frontend: Lovable (Orbean). Backend: Darian. Ads: Marcu. Target: MVP lansat Iunie-Iulie 2026.",
  },
  {
    title: "Car Selling — Status",
    category: "metrics",
    project_slug: "car-selling",
    content: "Automatizare OLX: Claude caută mașini după criterii, le bagă în Google Sheet, trimite mesaje pe WhatsApp și negociază prețul. Tools gata, 0 teste reale. Pricing/comision nestabilit.",
  },
  {
    title: "Music — Status",
    category: "metrics",
    project_slug: "music",
    content: "Creare și vânzare beat-uri de înaltă calitate cu ajutorul Claude + tools. Pe viitor: mix, master și mai mult. Proiect activ în folderul Music.",
  },
  {
    title: "Obiective financiare 2026",
    category: "metrics",
    project_slug: "all",
    content: "Target: €1.500/lună venit net până Decembrie 2026. Prioritate #1: Site Hustle — prime vânzări până Aprilie 2026, cash flow consistent până la vară. AI Agency: primul client până la vară. Clevs AI Videos: 100 useri activi. Trevvly: MVP lansat Iunie-Iulie 2026.",
  },
];

export async function POST() {
  const results = [];

  for (const item of SEED_DATA) {
    const entry = await upsertKnowledge(item.title, item.project_slug, {
      title: item.title,
      category: item.category,
      content: item.content,
      project_slug: item.project_slug,
    });
    results.push({ title: item.title, ok: !!entry });
  }

  const failed = results.filter((r) => !r.ok);
  return Response.json({
    seeded: results.length,
    failed: failed.length,
    results,
  });
}
