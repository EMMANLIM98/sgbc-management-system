-- Add new fields to visitors table for enhanced tracking
ALTER TABLE public.visitors
ADD COLUMN IF NOT EXISTS email_address text,
ADD COLUMN IF NOT EXISTS is_first_time_visitor boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS prayer_requests text,
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visitor_status text DEFAULT 'first_time' CHECK (visitor_status IN ('first_time', 'returning', 'needs_followup', 'interested_membership', 'prayer_request_only')),
ADD COLUMN IF NOT EXISTS visitor_code text UNIQUE,
ADD COLUMN IF NOT EXISTS home_address text;

-- Create index on visitor_code for QR scanning
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_code ON public.visitors(visitor_code);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(visitor_status);

-- Add comment on columns
COMMENT ON COLUMN public.visitors.email_address IS 'Email address of the visitor';
COMMENT ON COLUMN public.visitors.is_first_time_visitor IS 'Whether this is the visitor first time at the church';
COMMENT ON COLUMN public.visitors.prayer_requests IS 'Prayer requests from the visitor';
COMMENT ON COLUMN public.visitors.interests IS 'Array of interests: Bible Study, Small Group, Volunteer Ministry, Baptism, Church Membership';
COMMENT ON COLUMN public.visitors.visitor_status IS 'Status for color coding: first_time, returning, needs_followup, interested_membership, prayer_request_only';
COMMENT ON COLUMN public.visitors.visitor_code IS 'Unique code for QR generation';
COMMENT ON COLUMN public.visitors.home_address IS 'Home address of the visitor';
