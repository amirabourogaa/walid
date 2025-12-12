-- Add columns to store client/company information in transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entity_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entity_id UUID;

COMMENT ON COLUMN transactions.entity_type IS 'Type of entity: client, company, or manual';
COMMENT ON COLUMN transactions.entity_name IS 'Name of the client or company';
COMMENT ON COLUMN transactions.entity_id IS 'ID of the client if entity_type is client';