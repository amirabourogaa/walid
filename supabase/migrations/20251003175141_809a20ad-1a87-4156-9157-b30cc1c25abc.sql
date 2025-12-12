-- Drop existing authenticated-only policies on clients table
DROP POLICY IF EXISTS "Allow authenticated users to view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON public.clients;

-- Create policies that allow anon users (temporary solution for mock auth)
-- WARNING: In production, you MUST implement proper Supabase Auth
CREATE POLICY "Allow anon to view clients"
ON public.clients
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon to insert clients"
ON public.clients
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon to update clients"
ON public.clients
FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Allow anon to delete clients"
ON public.clients
FOR DELETE
TO anon
USING (true);