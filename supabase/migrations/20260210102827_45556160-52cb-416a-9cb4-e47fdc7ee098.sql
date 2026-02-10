CREATE OR REPLACE FUNCTION generate_quote_reference(
  p_customer_name TEXT,
  p_category TEXT DEFAULT 'Keuken'
) RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_clean_name TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_clean_name := TRIM(SPLIT_PART(p_customer_name, ',', 1));

  SELECT COALESCE(MAX(
    CASE 
      WHEN reference ~ (v_year || '-[0-9]+$')
      THEN SUBSTRING(reference FROM '[0-9]+$')::INTEGER
      ELSE 0
    END
  ), 0) + 1 INTO v_seq
  FROM quotes
  WHERE reference LIKE v_clean_name || ' - ' || p_category || ' - ' || v_year || '-%';

  RETURN v_clean_name || ' - ' || p_category || ' - ' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;