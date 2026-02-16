
-- Eenmalige correctie: artikelcode uit productnamen verwijderen voor Bosch
UPDATE products 
SET name = TRIM(SUBSTRING(name FROM POSITION(',' IN name) + 1))
WHERE supplier_id = 'e70c4a1a-b3e1-460b-86b6-be9644eaaf56' 
  AND name LIKE article_code || ',%';
