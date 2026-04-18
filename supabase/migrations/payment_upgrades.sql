-- ================================================================
-- Payment Upgrades: Refunds & Team-Level Payments
-- Run this in your Supabase SQL editor
-- ================================================================

-- 1. Add new statuses to payment_status_enum
-- NOTE: We use DO block to prevent error if they already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM (
      'not_required',
      'pending',
      'submitted',
      'verified',
      'rejected'
    );
  END IF;
  
  -- Add new values if enum already exists
  ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'refund_requested';
  ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'refunded';
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

-- 2. Add payment tracking to teams table
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS payment_status       payment_status_enum NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_proof_url    TEXT                DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMPTZ         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by          UUID                REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason     TEXT                DEFAULT NULL;

-- 3. (Optional) Set payment_status to 'not_required' for existing teams associated with free events
UPDATE teams t
SET payment_status = 'not_required'
FROM events e
WHERE t.event_id = e.id AND e.is_paid = FALSE;
