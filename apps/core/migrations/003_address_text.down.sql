-- Revert customers.address from text back to jsonb.
ALTER TABLE customers
    ALTER COLUMN address TYPE jsonb USING CASE
        WHEN address IS NULL OR address = '' THEN '{}'::jsonb
        ELSE address::jsonb
    END,
    ALTER COLUMN address SET DEFAULT '{}'::jsonb;
