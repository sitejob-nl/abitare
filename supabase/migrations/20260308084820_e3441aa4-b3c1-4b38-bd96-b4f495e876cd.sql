
-- Check remaining checklist items
UPDATE order_checklist_items SET checked = true, checked_at = now() WHERE order_id = '06e00735-0869-4a26-b468-b1817912e70d' AND checked = false;

-- Insert a test document
INSERT INTO order_documents (order_id, document_type, file_name, title)
VALUES ('06e00735-0869-4a26-b468-b1817912e70d', 'tekening', 'test-tekening.pdf', 'Test Tekening');

-- Disable deposit requirement (total is 0 anyway)
UPDATE orders SET deposit_required = false WHERE id = '06e00735-0869-4a26-b468-b1817912e70d';
