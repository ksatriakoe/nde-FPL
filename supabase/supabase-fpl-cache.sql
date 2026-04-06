-- FPL Cache — run this in Supabase SQL Editor
-- Stores FPL API responses as cache for fallback when Vercel proxy is blocked

CREATE TABLE IF NOT EXISTS fpl_cache (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_fpl_cache_updated ON fpl_cache(updated_at);

-- RLS policies
ALTER TABLE fpl_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read (frontend with anon key)
CREATE POLICY "Public read fpl_cache" ON fpl_cache
    FOR SELECT USING (true);

-- Service role can insert/update (GitHub Actions)
CREATE POLICY "Service role write fpl_cache" ON fpl_cache
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update fpl_cache" ON fpl_cache
    FOR UPDATE USING (true);
