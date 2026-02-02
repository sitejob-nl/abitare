-- Artimar leverancier toevoegen
INSERT INTO suppliers (code, name, supplier_type, lead_time_weeks, is_active)
VALUES ('ARTIMAR', 'Artimar', 'werkblad', 2, true)
ON CONFLICT (code) DO NOTHING;