-- Drop the existing constraint if it exists
ALTER TABLE public.transactions_history
DROP CONSTRAINT IF EXISTS transactions_history_modified_by_fkey;

-- Recreate the foreign key constraint linking to profiles table
ALTER TABLE public.transactions_history
ADD CONSTRAINT transactions_history_modified_by_fkey 
FOREIGN KEY (modified_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;