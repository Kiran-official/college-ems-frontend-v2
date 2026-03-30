-- Add is_global to certificate_templates
ALTER TABLE public.certificate_templates
ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false NOT NULL;

-- Allow event_id to be null for global templates
ALTER TABLE public.certificate_templates
ALTER COLUMN event_id DROP NOT NULL;

-- Certificates tracking table (if it doesn't already exist with these fields)
-- We will alter existing table or create it if missing.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certificates') THEN
        CREATE TABLE public.certificates (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
            student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            winner_id uuid REFERENCES public.winners(id) ON DELETE CASCADE,
            certificate_type text NOT NULL CHECK (certificate_type in ('participation', 'winner')),
            status text NOT NULL DEFAULT 'pending',
            file_path text,
            storage_path text,
            verification_id text UNIQUE,
            error_message text,
            retry_count integer DEFAULT 0 NOT NULL,
            last_retried_at timestamp with time zone,
            generated_at timestamp with time zone,
            created_at timestamp with time zone DEFAULT now() NOT NULL
        );
        
        -- Add index for fast lookups
        CREATE INDEX IF NOT EXISTS idx_certificates_event_user ON public.certificates(event_id, student_id);
        CREATE INDEX IF NOT EXISTS idx_certificates_verification ON public.certificates(verification_id);
    ELSE
        -- Add missing columns to existing table
        ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS storage_path text;
        ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS verification_id text UNIQUE;
        -- Create index if not exists
        CREATE INDEX IF NOT EXISTS idx_certificates_verification ON public.certificates(verification_id);
    END IF;
END $$;

-- Update RLS for certificate_templates to allow viewing global templates
DROP POLICY IF EXISTS "Anyone can view active certificate templates" ON public.certificate_templates;
CREATE POLICY "Anyone can view active or global certificate templates" 
ON public.certificate_templates FOR SELECT 
USING (is_active = true OR is_global = true);

-- Add Storage Bucket for certificates if not exists (This requires superuser, or must be done via Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('certificates', 'certificates', true)
-- ON CONFLICT (id) DO NOTHING;
