-- Migration 003: Knowledge Base + Agent Memories
-- Run this in Supabase Dashboard > SQL Editor

-- ═══════════════════════════════════════════════════════════════════════════════
-- KNOWLEDGE BASE — tot ce știe compania despre afacerea utilizatorului
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project_slug TEXT NOT NULL DEFAULT 'all',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by project and category
CREATE INDEX IF NOT EXISTS idx_kb_project_category ON knowledge_base(project_slug, category);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_updated_at ON knowledge_base;
CREATE TRIGGER kb_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON knowledge_base
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AGENT MEMORIES — fiecare agent își amintește ce e important
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL,
  project_slug TEXT NOT NULL DEFAULT 'all',
  content TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high', 'critical')),
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast agent+project lookups
CREATE INDEX IF NOT EXISTS idx_mem_agent_project ON agent_memories(agent_slug, project_slug);

-- RLS policies
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON agent_memories
  FOR ALL USING (true) WITH CHECK (true);
