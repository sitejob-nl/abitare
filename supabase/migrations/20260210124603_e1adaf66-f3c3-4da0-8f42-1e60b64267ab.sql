
-- Add Exact Online tracking columns for sales orders and purchase orders sync

-- Track which orders have been synced as SalesOrders to Exact
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS exact_sales_order_number text;

-- Track which supplier orders have been synced as PurchaseOrders to Exact  
ALTER TABLE public.supplier_orders
ADD COLUMN IF NOT EXISTS exact_purchase_order_id text;

-- Track supplier linking to Exact Online (as Supplier accounts)
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS exact_supplier_id text;
