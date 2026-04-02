-- Crypto Charts Cache Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crypto_cache (
    id TEXT PRIMARY KEY,             -- e.g. 'bitcoin_30'
    coin_id TEXT NOT NULL,           -- 'bitcoin', 'ethereum', 'binancecoin', 'solana'
    days INTEGER NOT NULL,           -- 1, 7, 30
    data JSONB NOT NULL,             -- { prices: [[ts, price], ...], total_volumes: [[ts, vol], ...] }
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_cache_coin ON crypto_cache(coin_id);
CREATE INDEX IF NOT EXISTS idx_crypto_cache_updated ON crypto_cache(updated_at);

-- RLS
ALTER TABLE crypto_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read crypto_cache" ON crypto_cache
    FOR SELECT USING (true);

CREATE POLICY "Service insert crypto_cache" ON crypto_cache
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update crypto_cache" ON crypto_cache
    FOR UPDATE USING (true);
