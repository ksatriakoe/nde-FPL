-- FPL Scout — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    tx_hash TEXT,
    plan TEXT NOT NULL DEFAULT 'premium_monthly',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet ON subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);

-- RLS policies (enable row-level security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (check subscription status)
CREATE POLICY "Public read access" ON subscriptions
    FOR SELECT USING (true);

-- Allow inserts from anon key (for subscription creation)
CREATE POLICY "Anon insert access" ON subscriptions
    FOR INSERT WITH CHECK (true);

-- Allow updates for existing subscriptions
CREATE POLICY "Anon update access" ON subscriptions
    FOR UPDATE USING (true);

-- ============================================
-- AI Results table (stores Gemini AI outputs per user)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('captain_picks', 'predictions', 'gw_summary', 'transfers')),
    gameweek INTEGER NOT NULL,
    result TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (wallet_address, type)
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_ai_results_wallet ON ai_results(wallet_address);

-- RLS policies
ALTER TABLE ai_results ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own results
CREATE POLICY "Public read ai_results" ON ai_results
    FOR SELECT USING (true);

-- Allow insert from anon key
CREATE POLICY "Anon insert ai_results" ON ai_results
    FOR INSERT WITH CHECK (true);

-- Allow update from anon key
CREATE POLICY "Anon update ai_results" ON ai_results
    FOR UPDATE USING (true);
