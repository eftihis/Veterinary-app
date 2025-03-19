-- Ensure contacts table has RLS enabled
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON public.contacts;

-- Allow users to view all contacts (you might want to restrict this in production)
CREATE POLICY "Users can view contacts" 
ON public.contacts
FOR SELECT 
USING (true);

-- Allow users to update contacts linked to their profile
CREATE POLICY "Users can update contacts" 
ON public.contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.contact_id = contacts.id
    AND profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.contact_id = contacts.id
    AND profiles.id = auth.uid()
  )
);

-- Check the updated_at column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$; 