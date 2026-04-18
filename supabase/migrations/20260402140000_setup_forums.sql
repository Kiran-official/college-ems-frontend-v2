-- ═══════════════════════════════════════════════════════════════
-- Migration: Clean all events + Add forum field
-- ═══════════════════════════════════════════════════════════════

-- 1. Delete all event-related data (order matters for FK constraints)
DELETE FROM public.certificates;
DELETE FROM public.winners;
DELETE FROM public.individual_registrations;
DELETE FROM public.team_members;
DELETE FROM public.teams;
DELETE FROM public.faculty_in_charge;
DELETE FROM public.certificate_templates WHERE event_id IS NOT NULL;
DELETE FROM public.events;

-- 2. Add forum column to events table (nullable / optional)
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS forum TEXT DEFAULT NULL;

-- 3. (Optional) Add a comment for documentation
COMMENT ON COLUMN public.events.forum IS 'The forum/cell that organized this event, e.g. PURVI, LAKSHYA, NCC, etc.';
