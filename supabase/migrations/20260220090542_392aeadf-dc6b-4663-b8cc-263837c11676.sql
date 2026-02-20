-- Stap 1: Deactiveer Stosa producten die nog in gebruik zijn
UPDATE products SET is_active = false
WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22'
  AND (
    id IN (SELECT DISTINCT product_id FROM quote_lines WHERE product_id IS NOT NULL)
    OR id IN (SELECT DISTINCT product_id FROM order_lines WHERE product_id IS NOT NULL)
  );

-- Stap 2: Verwijder pims_image_queue entries voor Stosa
DELETE FROM pims_image_queue WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22';

-- Stap 3: Verwijder alle niet-gekoppelde Stosa producten
DELETE FROM products
WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22'
  AND id NOT IN (SELECT DISTINCT product_id FROM quote_lines WHERE product_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT product_id FROM order_lines WHERE product_id IS NOT NULL);