-- This script adds a comment to the line_items JSONB column in the invoices table
-- to document the updated structure that includes quantity

-- Add comment to the invoices table line_items column
COMMENT ON COLUMN invoices.line_items IS 'JSONB array of line items, each with structure: {
  "description": "text description",
  "itemId": "unique item identifier",
  "itemName": "name of the item",
  "quantity": numeric (defaults to 1 if not specified),
  "price": numeric price per unit,
  "type": "item" or "discount"
}';

-- Note: This SQL command only adds documentation and does not modify any data
-- All existing line items should be updated automatically to include quantity=1 
-- by the application logic when editing invoices 