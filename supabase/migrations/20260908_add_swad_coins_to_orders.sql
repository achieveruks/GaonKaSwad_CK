-- Migration: Add Swad Coins tracking columns to public.orders and unique redemption index
-- Date: 2026-09-08

-- 1. Add Swad Coins tracking columns to orders table
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS swad_coins_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS swad_coin_discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 2. Prevent duplicate redemption transactions for the same order
CREATE UNIQUE INDEX IF NOT EXISTS idx_swad_coin_tx_unique_order_redeem
  ON public.swad_coin_transactions(order_id, type)
  WHERE type = 'REDEEM' AND order_id IS NOT NULL;
