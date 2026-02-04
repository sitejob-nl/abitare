
-- Update the existing order to be assigned to the installer and set appropriate status
UPDATE orders 
SET 
  installer_id = '5bab2af9-6a0c-42f0-b031-2642d0fdf20d',
  status = 'montage_gepland',
  expected_installation_date = CURRENT_DATE + interval '3 days'
WHERE id = '1c295801-5dbc-47df-b6f3-2b8f66d1abe8';
