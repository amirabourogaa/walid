-- Create storage bucket for transaction archives
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-archives', 'transaction-archives', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for transaction archives bucket
CREATE POLICY "Managers can view transaction archive files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transaction-archives' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Managers can upload transaction archive files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transaction-archives' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Managers can delete transaction archive files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transaction-archives' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);