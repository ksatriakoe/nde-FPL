-- =============================================================
-- Supabase Table: swap_tokens
-- Menyimpan daftar token yang tersedia di Swap/Pool
-- Owner bisa manage lewat Admin Dashboard (CRUD)
-- =============================================================

-- 1. Buat tabel swap_tokens
CREATE TABLE IF NOT EXISTS swap_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INT NOT NULL DEFAULT 18,
  logo_uri TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_swap_tokens_active ON swap_tokens (is_active);
CREATE INDEX IF NOT EXISTS idx_swap_tokens_symbol ON swap_tokens (symbol);

-- 3. Seed data awal (token-token yang sudah ada di swapConstants.js)
INSERT INTO swap_tokens (address, name, symbol, decimals, logo_uri, sort_order) VALUES
  ('0x48e72A7FEAeA5e7B6DADbc7D82ac706F93CEf96C', 'NDESO', 'NDESO', 18, '/Ndeso.png', 1),
  ('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'USD Coin', 'USDC', 6, 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png', 2),
  ('0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', 'Dai Stablecoin', 'DAI', 18, 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png', 3),
  ('0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', 'Tether USD', 'USDT', 6, 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png', 4)
ON CONFLICT (address) DO NOTHING;

-- 4. RLS (Row Level Security) — opsional tapi recommended
-- Aktifkan RLS
ALTER TABLE swap_tokens ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa READ token yang aktif (untuk frontend)
CREATE POLICY "Anyone can read active tokens"
  ON swap_tokens FOR SELECT
  USING (is_active = true);

-- Allow CRUD via anon key (auth dikontrol via wallet address di frontend)
CREATE POLICY "Anon can insert tokens"
  ON swap_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update tokens"
  ON swap_tokens FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete tokens"
  ON swap_tokens FOR DELETE
  USING (true);

-- =============================================================
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy-paste seluruh isi file ini
-- 3. Klik "Run"
-- 4. Cek di Table Editor apakah tabel swap_tokens sudah muncul
-- =============================================================
