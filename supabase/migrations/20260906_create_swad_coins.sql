-- Migration: Swad Coin Reward and Transaction Ledger System
-- Adds swad_coin_balance column to customers table, swad_coin_rewards, and swad_coin_transactions

-- 1. Add swad_coin_balance column to customers if not exists
ALTER TABLE IF EXISTS customers
  ADD COLUMN IF NOT EXISTS swad_coin_balance INT NOT NULL DEFAULT 0;

-- 2. Create swad_coin_rewards table
CREATE TABLE IF NOT EXISTS swad_coin_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  eligible_order_value NUMERIC(10, 2) NOT NULL,
  reward_percentage NUMERIC(5, 2) NOT NULL,
  coin_amount INT NOT NULL CHECK (coin_amount >= 5 AND coin_amount <= 100),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for customer pending rewards lookup
CREATE INDEX IF NOT EXISTS idx_swad_coin_rewards_customer_status
  ON swad_coin_rewards(customer_id, status);

-- Index for expiration checking
CREATE INDEX IF NOT EXISTS idx_swad_coin_rewards_expires_at
  ON swad_coin_rewards(expires_at);

-- 3. Create swad_coin_transactions table
CREATE TABLE IF NOT EXISTS swad_coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'REFUND', 'ADMIN_CREDIT', 'ADMIN_DEBIT')),
  amount INT NOT NULL,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  order_id TEXT,
  reward_id UUID REFERENCES swad_coin_rewards(id) ON DELETE SET NULL,
  admin_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for customer transaction history
CREATE INDEX IF NOT EXISTS idx_swad_coin_tx_customer
  ON swad_coin_transactions(customer_id, created_at DESC);

-- Index for order refund lookup
CREATE INDEX IF NOT EXISTS idx_swad_coin_tx_order
  ON swad_coin_transactions(order_id);

-- 4. Row-Level Security Policies for Swad Coins
ALTER TABLE IF EXISTS public.swad_coin_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.swad_coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Swad Coin Rewards" ON public.swad_coin_rewards;
DROP POLICY IF EXISTS "Public Manage Swad Coin Rewards" ON public.swad_coin_rewards;
CREATE POLICY "Public Read Swad Coin Rewards" ON public.swad_coin_rewards FOR SELECT USING (true);
CREATE POLICY "Public Manage Swad Coin Rewards" ON public.swad_coin_rewards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Swad Coin Transactions" ON public.swad_coin_transactions;
DROP POLICY IF EXISTS "Public Manage Swad Coin Transactions" ON public.swad_coin_transactions;
CREATE POLICY "Public Read Swad Coin Transactions" ON public.swad_coin_transactions FOR SELECT USING (true);
CREATE POLICY "Public Manage Swad Coin Transactions" ON public.swad_coin_transactions FOR ALL USING (true) WITH CHECK (true);

