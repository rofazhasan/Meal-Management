-- Migration 006: Fix wallet_transactions user_id nullability constraint

ALTER TABLE wallet_transactions ALTER COLUMN user_id DROP NOT NULL;
