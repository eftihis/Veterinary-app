-- Create animal_events table
CREATE TABLE animal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id),
  event_type TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_animal_events_animal_id ON animal_events(animal_id);
CREATE INDEX idx_animal_events_event_type ON animal_events(event_type);
CREATE INDEX idx_animal_events_event_date ON animal_events(event_date);
CREATE INDEX idx_animal_events_created_by ON animal_events(created_by);

-- Create GIN index for JSONB queries on details
CREATE INDEX idx_animal_events_details ON animal_events USING GIN (details);

-- Add comment for documentation
COMMENT ON TABLE animal_events IS 'Tracks non-medical events and changes related to animals';

-- Add RLS policy
ALTER TABLE animal_events ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing events
CREATE POLICY "Users can view all animal events" 
ON animal_events
FOR SELECT
USING (true);

-- Create policy for inserting events
CREATE POLICY "Users can create animal events" 
ON animal_events
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Create policy for updating events
CREATE POLICY "Users can update their own animal events" 
ON animal_events
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create policy for deleting events
CREATE POLICY "Users can delete their own animal events" 
ON animal_events
FOR DELETE
USING (auth.uid() = created_by);

-- Create unified animal timeline view that combines invoice line items and animal events
CREATE OR REPLACE VIEW animal_timeline AS
-- Invoice line items as medical events
SELECT 
  'invoice-' || l.invoice_id || '-' || l.item_id AS id,
  l.animal_id,
  l.item_name AS event_type,
  l.created_at AS event_date,
  jsonb_build_object(
    'procedure', l.item_name,
    'description', l.description,
    'price', l.price,
    'document_number', l.document_number,
    'invoice_id', l.invoice_id
  ) AS details,
  l.created_by,
  l.created_at AS created_at,
  l.created_at AS updated_at,
  false AS is_deleted,
  true AS is_invoice_item
FROM line_items_view l
WHERE l.animal_id IS NOT NULL
  AND l.price > 0  -- Exclude negative price items (discounts)

UNION ALL

-- Other animal events
SELECT
  id::text,
  animal_id,
  event_type,
  event_date,
  details,
  created_by,
  created_at,
  updated_at,
  is_deleted,
  false AS is_invoice_item
FROM animal_events
WHERE NOT is_deleted;

-- Enable RLS on the view with security_invoker so it inherits policies from the base tables
CREATE OR REPLACE VIEW animal_timeline
WITH (security_invoker = on) AS
-- Invoice line items as medical events
SELECT 
  'invoice-' || l.invoice_id || '-' || l.item_id AS id,
  l.animal_id,
  l.item_name AS event_type,
  l.created_at AS event_date,
  jsonb_build_object(
    'procedure', l.item_name,
    'description', l.description,
    'price', l.price,
    'document_number', l.document_number,
    'invoice_id', l.invoice_id
  ) AS details,
  l.created_by,
  l.created_at AS created_at,
  l.created_at AS updated_at,
  false AS is_deleted,
  true AS is_invoice_item
FROM line_items_view l
WHERE l.animal_id IS NOT NULL
  AND l.price > 0  -- Exclude negative price items (discounts)

UNION ALL

-- Other animal events
SELECT
  id::text,
  animal_id,
  event_type,
  event_date,
  details,
  created_by,
  created_at,
  updated_at,
  is_deleted,
  false AS is_invoice_item
FROM animal_events
WHERE NOT is_deleted; 