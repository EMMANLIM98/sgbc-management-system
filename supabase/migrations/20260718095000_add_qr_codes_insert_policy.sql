-- Add INSERT policy for qr_codes to allow QR code generation
-- Users can create QR codes for registrations/events in their churches

CREATE POLICY "generate qr codes in my churches"
  ON public.qr_codes FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));
