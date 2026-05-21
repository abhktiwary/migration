-- Sample migration (no external config required)
-- Creates a small demo table for testing execution commands.

CREATE TABLE IF NOT EXISTS demo_commands (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL DEFAULT 'migration-ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO demo_commands (label)
SELECT 'sample-migration-applied'
WHERE NOT EXISTS (
  SELECT 1 FROM demo_commands WHERE label = 'sample-migration-applied'
);
