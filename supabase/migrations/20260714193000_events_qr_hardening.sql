-- Event QR hardening
-- Enforce one QR code per registration and optimize secure token validation

ALTER TABLE public.qr_codes
  ADD CONSTRAINT qr_codes_registration_unique UNIQUE (registration_id);

CREATE INDEX IF NOT EXISTS qr_codes_token_event_idx
  ON public.qr_codes (token, event_id);

CREATE INDEX IF NOT EXISTS event_checkins_event_checkedin_idx
  ON public.event_checkins (event_id, checked_in_at DESC);
