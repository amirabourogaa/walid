-- Create whatsapp_message_history table
CREATE TABLE IF NOT EXISTS public.whatsapp_message_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visa_status text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view whatsapp history"
  ON public.whatsapp_message_history
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND 
    (has_role(auth.uid(), 'admin'::app_role) OR 
     has_role(auth.uid(), 'manager'::app_role) OR 
     has_role(auth.uid(), 'employee'::app_role))
  );

CREATE POLICY "Authenticated users can insert whatsapp history"
  ON public.whatsapp_message_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (has_role(auth.uid(), 'admin'::app_role) OR 
     has_role(auth.uid(), 'manager'::app_role) OR 
     has_role(auth.uid(), 'employee'::app_role))
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_history_client_id ON public.whatsapp_message_history(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_history_sent_at ON public.whatsapp_message_history(sent_at DESC);

-- Add to realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_history;