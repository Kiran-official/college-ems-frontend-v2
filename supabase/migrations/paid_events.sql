-- ================================================================
-- Paid Event Registration Migration
-- Run this in your Supabase SQL editor
-- ================================================================

-- ── 1. Update events table ──────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_paid          BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS upi_qr_url       TEXT          DEFAULT NULL;

-- ── 2. Create payment status enum ──────────────────────────────

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
END$$;

-- ── 3. Update individual_registrations table ────────────────────

ALTER TABLE individual_registrations
  ADD COLUMN IF NOT EXISTS payment_status       payment_status_enum NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_proof_url    TEXT                DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMPTZ         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by          UUID                DEFAULT NULL REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason     TEXT                DEFAULT NULL;

-- ── 4. Create payment-proofs storage bucket ─────────────────────
-- NOTE: Run this in the Supabase SQL editor (storage schema)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  FALSE,  -- private bucket
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create event-qr bucket for public QR code images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-qr',
  'event-qr',
  TRUE,  -- public bucket (QR codes are not sensitive)
  2097152, -- 2 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── 5. Storage RLS Policies ─────────────────────────────────────

-- Payment proofs: students can upload to their own folder
CREATE POLICY "Students can upload own payment proof"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Payment proofs: students can view only their own proofs
CREATE POLICY "Students can view own payment proof"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Payment proofs: admins can view all proofs (service role used in admin actions)
-- This is handled via the service role key in admin client — no additional policy needed.

-- Event QR: anyone authenticated can view
CREATE POLICY "Authenticated users can view event QR"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-qr');

-- Event QR: only admins/teachers can upload (enforced in server action, not RLS)
CREATE POLICY "Authenticated users can upload event QR"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-qr');
