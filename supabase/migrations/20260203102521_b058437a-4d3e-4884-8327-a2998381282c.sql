-- Create storage bucket for order documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-documents',
  'order-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order documents
CREATE POLICY "Users can view order documents they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-documents'
  AND (
    EXISTS (
      SELECT 1 FROM order_documents od
      JOIN orders o ON o.id = od.order_id
      WHERE od.file_path = name
      AND (
        is_admin(auth.uid())
        OR o.division_id = get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
        OR o.installer_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can upload order documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-documents'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their uploaded documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-documents'
  AND (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM order_documents od
      WHERE od.file_path = name
      AND od.uploaded_by = auth.uid()
    )
  )
);