-- Update all customers to Maastricht division
UPDATE customers SET division_id = '22222222-2222-2222-2222-222222222222' WHERE division_id IS NULL OR division_id != '22222222-2222-2222-2222-222222222222';

-- Update all quotes to Maastricht division
UPDATE quotes SET division_id = '22222222-2222-2222-2222-222222222222' WHERE division_id IS NULL OR division_id != '22222222-2222-2222-2222-222222222222';

-- Update all orders to Maastricht division
UPDATE orders SET division_id = '22222222-2222-2222-2222-222222222222' WHERE division_id IS NULL OR division_id != '22222222-2222-2222-2222-222222222222';