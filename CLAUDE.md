# Agent Instructions — AI Company

You're working inside the **WAT framework** (Workflows, Agents, Tools).

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines: objective, inputs, tools to use, expected outputs, edge cases

**Layer 2: Agents (The Decision-Maker)**
- Your role: intelligent coordination
- Read the relevant workflow, run tools in sequence, handle failures, ask when needed
- Don't try to do execution directly — delegate to tools

**Layer 3: Tools (The Execution)**
- Python/Node scripts in `tools/` that do the actual work
- API keys in `.env.local`
- Consistent, testable, fast

## How to Operate

**1. Look for existing tools first**
Check `tools/` before building anything new.

**2. Learn and adapt when things fail**
- Read full error + trace
- Fix + retest
- Update workflow with what you learned

**3. Keep workflows current**
Don't create or overwrite workflows without asking unless explicitly told to.

## Self-Improvement Loop
1. Identify what broke → 2. Fix tool → 3. Verify → 4. Update workflow → 5. Move on

---

## Project: AI Company HQ

### Ce e asta
HQ virtual pentru Alex — singurul om real. Restul sunt agenți AI organizați ca o companie reală, cu departamente, directori, sub-agenți. Alex coordonează la nivel înalt, agenții execută și deliberează.

### Rulare
```bash
npm run dev     # http://localhost:3000
npm run build
```

### Stack
- Next.js 16 App Router + Tailwind + shadcn/ui
- Streaming SSE pentru răspunsuri AI în timp real
- Mock mode activ (fără API key) → Live mode când e `ANTHROPIC_API_KEY`
- Supabase (Faza 4, neimplementat încă)

### Fișiere critice
```
src/lib/ai/agents.ts        — 11 agenți cu system prompts + mock responses
src/lib/ai/orchestrator.ts  — streaming SSE + Board Meeting logic
src/app/api/chat/route.ts   — SSE endpoint
src/components/chat/ChatWindow.tsx
src/app/(dashboard)/chat/[id]/page.tsx
```

### Agenți disponibili
`personal-assistant`, `ceo`, `cto`, `marketing-director`, `script-writer`, `social-media-manager`, `ads-manager`, `finance-director`, `legal-director`, `analytics`, `support-director`

### Status: v0.1 COMPLET
- UI toate paginile funcționale
- Streaming SSE per agent
- Board Meeting (deliberare secvențială cu context cumulat)
- Mock responses per agent (fără API key)
- Responsive: sidebar desktop + bottom nav mobile
- Dark theme forțat global

### Roadmap
| Fază | Ce | Status |
|------|----|--------|
| 4 | Supabase — persistență conversații + metrici live | pending |
| 5 | Personal Assistant real — briefing cu context actual | pending |
| 6 | Idea Vault + Video Intelligence cu persistență | pending |
| 7 | Tool Runner FastAPI — rulează scripts din UI | pending |
| 8 | Problem Tracker + Strategy Board dinamic | pending |
| - | Live AI cu Anthropic SDK | pending (nevoie API key) |

### Live AI
```
.env.local:
  ANTHROPIC_API_KEY=sk-ant-...
  AI_MODE=live

npm install @anthropic-ai/sdk
# Implementează streamLiveResponse() în orchestrator.ts
```

---

## Reguli critice

### Turbopack parsing bug
Mock responses în `orchestrator.ts` **TREBUIE template literals (backticks)**, NU double quotes.
Romanian chars + numere ca `30s` în double-quoted strings → `Identifier cannot follow number` error.

### Next.js 16 dynamic routes
`params` e Promise → `use(params)` în client components sau `await params` în server components.

### Streaming SSE format
```ts
// Chunks:
{ type: "text" | "agent_start" | "agent_end" | "done", agentSlug?, agentName?, agentEmoji?, content? }
// Wire:
data: ${JSON.stringify(chunk)}\n\n
```

### Context afaceri (injectat în toți agenții)
- **Site Hustle** — vinde site-uri la €200, 1030 leads, 8 interested neconvertiți
- **AI Agency** — voice agents/chatbots, 0 clienți, outreach în pregătire
- **Car Selling** — automatizare OLX, tools gata, 0 teste reale
- **Music** — beats, în development
