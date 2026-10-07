-- Add optional public profile fields to stores.
ALTER TABLE stores
    ADD COLUMN logo_url TEXT,
    ADD COLUMN description TEXT,
    ADD COLUMN category TEXT;
