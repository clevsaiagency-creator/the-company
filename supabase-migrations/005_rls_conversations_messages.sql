-- Migration 005: RLS policies pentru conversations și messages
-- Rulează în Supabase Dashboard > SQL Editor

-- CONVERSATIONS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON conversations;
CREATE POLICY "Allow all for anon" ON conversations
  FOR ALL USING (true) WITH CHECK (true);

-- MESSAGES
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON messages;
CREATE POLICY "Allow all for anon" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- IDEAS (dacă există)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ideas') THEN
    ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
    BEGIN
      CREATE POLICY "Allow all for anon" ON ideas FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- PROBLEMS (dacă există)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'problems') THEN
    ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
    BEGIN
      CREATE POLICY "Allow all for anon" ON problems FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
