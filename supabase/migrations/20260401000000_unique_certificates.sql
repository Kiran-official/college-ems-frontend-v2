-- Prevent duplicate certificates for the same student/event/type
-- This acts as the final guard against race conditions in the issuance logic

-- 1. Identify and remove any existing duplicates before adding the constraint
-- (Keeps the oldest record, deletes newer duplicates)
DELETE FROM public.certificates a
USING public.certificates b
WHERE a.id > b.id
  AND a.event_id = b.event_id
  AND a.student_id = b.student_id
  AND a.certificate_type = b.certificate_type;

-- 2. Add the unique constraint
ALTER TABLE public.certificates
ADD CONSTRAINT unique_event_student_cert_type 
UNIQUE (event_id, student_id, certificate_type);

-- 3. Add an index for faster checking on these fields (if not already covered)
CREATE INDEX IF NOT EXISTS idx_certificates_lookup 
ON public.certificates(event_id, student_id, certificate_type);
