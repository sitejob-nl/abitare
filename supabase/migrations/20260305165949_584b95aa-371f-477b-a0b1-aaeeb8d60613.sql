
-- Fix RLS: whatsapp_auto_templates needs admin write policy
CREATE POLICY "Authenticated users can manage whatsapp_auto_templates"
  ON public.whatsapp_auto_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
