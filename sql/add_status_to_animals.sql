-- Add status field to animals table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'animals' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE animals ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        
        -- Set status based on existing is_deceased field for consistency
        UPDATE animals SET status = 'deceased' WHERE is_deceased = true;
        
        -- Add comment
        COMMENT ON COLUMN animals.status IS 'Current status: active, adopted, foster, treatment, quarantine, deceased, etc.';
    END IF;
END $$; 