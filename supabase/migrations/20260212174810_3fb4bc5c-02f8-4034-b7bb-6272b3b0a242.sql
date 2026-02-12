
-- Delete order-related child tables
DELETE FROM order_status_history;
DELETE FROM order_checklist_items;
DELETE FROM order_documents;
DELETE FROM order_notes;
DELETE FROM order_lines;
DELETE FROM order_sections;
DELETE FROM customer_planning_preferences;
DELETE FROM customer_portal_tokens;
DELETE FROM communication_log;

-- Delete service ticket child tables
DELETE FROM service_ticket_status_history;
DELETE FROM service_ticket_notes;
DELETE FROM service_ticket_attachments;
DELETE FROM service_ticket_assignees;

-- Delete quote child tables
DELETE FROM quote_lines;
DELETE FROM quote_sections;

-- Delete main tables
DELETE FROM service_tickets;
DELETE FROM orders;
DELETE FROM quotes;

-- Delete product-related tables
DELETE FROM product_prices;
DELETE FROM product_colors;
DELETE FROM product_ranges;
DELETE FROM price_group_colors;
DELETE FROM price_groups;
DELETE FROM import_logs;
DELETE FROM products;
