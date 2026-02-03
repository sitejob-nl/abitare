-- 1. Korting velden toevoegen aan quote_sections
ALTER TABLE quote_sections 
ADD COLUMN IF NOT EXISTS discount_percentage numeric,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_description text;

-- 2. Order sections tabel aanmaken
CREATE TABLE order_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_section_id uuid REFERENCES quote_sections(id),
  section_type text NOT NULL,
  title text,
  sort_order int DEFAULT 0,
  subtotal numeric DEFAULT 0,
  discount_percentage numeric,
  discount_amount numeric DEFAULT 0,
  discount_description text,
  range_id uuid REFERENCES product_ranges(id),
  color_id uuid REFERENCES product_colors(id),
  front_number text,
  front_color text,
  corpus_color text,
  plinth_color text,
  hinge_color text,
  drawer_color text,
  handle_number text,
  column_height_mm int,
  countertop_height_mm int,
  countertop_thickness_mm int,
  workbench_material text,
  workbench_edge text,
  workbench_color text,
  configuration jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 3. Section_id toevoegen aan order_lines
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES order_sections(id);

-- 4. RLS policies voor order_sections
ALTER TABLE order_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_sections_select"
ON order_sections FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_sections.order_id 
    AND (
      is_admin(auth.uid()) 
      OR o.division_id = get_user_division_id(auth.uid()) 
      OR o.salesperson_id = auth.uid() 
      OR o.assistant_id = auth.uid()
      OR o.installer_id = auth.uid()
    )
  )
);

CREATE POLICY "order_sections_insert"
ON order_sections FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_sections.order_id 
    AND (
      is_admin(auth.uid()) 
      OR o.division_id = get_user_division_id(auth.uid()) 
      OR o.salesperson_id = auth.uid() 
      OR o.assistant_id = auth.uid()
    )
  )
);

CREATE POLICY "order_sections_update"
ON order_sections FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_sections.order_id 
    AND (
      is_admin(auth.uid()) 
      OR o.division_id = get_user_division_id(auth.uid()) 
      OR o.salesperson_id = auth.uid() 
      OR o.assistant_id = auth.uid()
    )
  )
);

CREATE POLICY "order_sections_delete"
ON order_sections FOR DELETE TO authenticated 
USING (
  is_admin(auth.uid())
);

-- 5. Index voor performance
CREATE INDEX idx_order_sections_order_id ON order_sections(order_id);
CREATE INDEX idx_order_lines_section_id ON order_lines(section_id);