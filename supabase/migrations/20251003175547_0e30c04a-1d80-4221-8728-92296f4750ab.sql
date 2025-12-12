-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'manager', 'employee', 'client')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  phone TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'client')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing RLS policies for clients table to use authenticated users
DROP POLICY IF EXISTS "Allow anon to view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow anon to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow anon to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow anon to delete clients" ON public.clients;

-- Create proper authenticated policies for clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (true);

-- Update storage policies for authenticated users
DROP POLICY IF EXISTS "Allow anon upload to client-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon view client-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update client-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete client-files" ON storage.objects;

CREATE POLICY "Authenticated users can upload to client-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can view client-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can update client-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete client-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-files');