-- Migration 004: Usage tracking (tokens + cost) per conversation
-- Run in Supabase SQL Editor

-- Add usage columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS input_tokens  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0;

-- View: total usage per project
CREATE OR REPLACE VIEW usage_summary AS
SELECT
  project_slug,
  COUNT(*)                    AS total_conversations,
  SUM(input_tokens)           AS total_input_tokens,
  SUM(output_tokens)          AS total_output_tokens,
  SUM(input_tokens + output_tokens) AS total_tokens,
  ROUND(SUM(cost_usd)::NUMERIC, 4) AS total_cost_usd
FROM conversations
GROUP BY project_slug;
