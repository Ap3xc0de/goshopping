-- Remove public profile fields from stores.
ALTER TABLE stores
    DROP COLUMN IF EXISTS logo_url,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS category;
