-- Clean up all Stosa data for a fresh re-import
-- Stosa supplier_id: 29a8e1aa-35da-4784-99ff-23129f36fe22

-- Step 1: Delete all product_prices for Stosa products
DELETE FROM public.product_prices
WHERE product_id IN (
  SELECT id FROM public.products
  WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22'
);

-- Step 2: Delete all product_ranges for Stosa
DELETE FROM public.product_ranges
WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22';

-- Step 3: Delete all products for Stosa
DELETE FROM public.products
WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22';