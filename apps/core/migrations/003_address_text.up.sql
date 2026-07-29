-- Convert customers.address from jsonb to text.
-- Existing rows with '{}' become empty string; other JSON objects are preserved as text.
ALTER TABLE customers
    ALTER COLUMN address TYPE text USING CASE
        WHEN address IS NULL OR address::text = '{}' THEN ''
        ELSE address::text
    END,
    ALTER COLUMN address SET DEFAULT '';
