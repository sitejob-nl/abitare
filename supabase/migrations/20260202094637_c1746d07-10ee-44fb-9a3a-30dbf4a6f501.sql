-- ============================================
-- SEED DATA: Vestigingen
-- ============================================
INSERT INTO public.divisions (id, name, code, city, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Roermond', 'ROE', 'Roermond', true),
  ('22222222-2222-2222-2222-222222222222', 'Maastricht', 'MAA', 'Maastricht', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED DATA: Leveranciers
-- ============================================
INSERT INTO public.suppliers (id, code, name, supplier_type, lead_time_weeks, is_active)
VALUES
  (gen_random_uuid(), 'STOSA', 'Stosa Cucine', 'keuken', 8, true),
  (gen_random_uuid(), 'MIELE', 'Miele', 'apparatuur', 2, true),
  (gen_random_uuid(), 'QUOOK', 'Quooker', 'apparatuur', 1, true),
  (gen_random_uuid(), 'SIEMENS', 'Siemens', 'apparatuur', 2, true),
  (gen_random_uuid(), 'BLANCO', 'Blanco', 'accessoire', 1, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED DATA: Product Categorieën
-- ============================================
INSERT INTO public.product_categories (id, code, name, sort_order, is_active)
VALUES
  (gen_random_uuid(), 'meubelen', 'Keukenmeubelen', 1, true),
  (gen_random_uuid(), 'apparatuur', 'Apparatuur', 2, true),
  (gen_random_uuid(), 'werkbladen', 'Werkbladen', 3, true),
  (gen_random_uuid(), 'montage', 'Montage', 4, true),
  (gen_random_uuid(), 'transport', 'Transport & Levering', 5, true),
  (gen_random_uuid(), 'accessoires', 'Accessoires', 6, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED DATA: Service Budget 2025 & 2026
-- ============================================
INSERT INTO public.service_budgets (year, total_budget, used_amount, bonus_percentage)
VALUES
  (2025, 10000, 3450, 10),
  (2026, 12000, 0, 10)
ON CONFLICT (year) DO UPDATE SET 
  total_budget = EXCLUDED.total_budget,
  used_amount = EXCLUDED.used_amount;