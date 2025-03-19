-- 1. Add profile_id column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES auth.users(id) NULL;

-- 2. Add index for better performance
CREATE INDEX IF NOT EXISTS contacts_profile_id_idx ON contacts(profile_id);

-- 3. Migrate existing data from profiles to contacts
UPDATE contacts c
SET profile_id = p.id
FROM profiles p
WHERE p.contact_id = c.id;

-- 4. Create a trigger to enforce email consistency
CREATE OR REPLACE FUNCTION enforce_profile_email_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- If profile_id is set, ensure email matches the auth.users email
    IF NEW.profile_id IS NOT NULL THEN
        NEW.email := (SELECT email FROM auth.users WHERE id = NEW.profile_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for insert/update
DROP TRIGGER IF EXISTS ensure_profile_email_consistency ON contacts;
CREATE TRIGGER ensure_profile_email_consistency
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_profile_email_consistency();

-- 5. Drop previous RLS policies that might interfere
DROP POLICY IF EXISTS "Ensure email consistency" ON contacts;
DROP POLICY IF EXISTS "Allow users to update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Allow contacts update" ON contacts;

-- 6. Create new RLS policies based on profile_id
-- Allow users to read all contacts
CREATE POLICY "Allow users to read contacts"
    ON contacts
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own contacts, but prevent email changes for profile-linked contacts
CREATE POLICY "Allow users to update contacts"
    ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        -- Either not linked to a profile
        profile_id IS NULL
        OR
        -- Or linked to the current user (and not trying to change email)
        (profile_id = auth.uid())
    );

-- Allow users to insert contacts
CREATE POLICY "Allow users to insert contacts"
    ON contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow users to delete only unlinked contacts
CREATE POLICY "Allow users to delete unlinked contacts"
    ON contacts
    FOR DELETE
    TO authenticated
    USING (profile_id IS NULL);

-- 7. Add comment explaining the profile_id column
COMMENT ON COLUMN contacts.profile_id IS 'Foreign key to auth.users for contacts that represent system users. When set, contact email must match user email.';

-- 8. Update frontend to handle this change
-- You'll need to update your UI to disable the email field for contacts with profile_id 