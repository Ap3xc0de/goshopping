-- Reverse of 011_storefront_commerce.up.sql — drops everything in reverse
-- dependency order. Tested by TestMigrations011DownIsReversible (Migrate(10)).

DROP INDEX IF EXISTS idx_products_store_category_id;
DROP INDEX IF EXISTS idx_products_search_trgm;

ALTER TABLE orders DROP COLUMN IF EXISTS currency;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_total;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_method;

ALTER TABLE products DROP COLUMN IF EXISTS category_id;
ALTER TABLE products DROP COLUMN IF EXISTS weight;

DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS shipping_methods;
DROP TABLE IF EXISTS shipping_zones;
DROP TABLE IF EXISTS product_variants;

-- products.category_id (dropped above) held the only inbound FK to categories.
DROP TABLE IF EXISTS categories;

-- The wrapper depends on the unaccent extension: drop it before the extensions.
DROP FUNCTION IF EXISTS public.immutable_unaccent(text);

DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS unaccent;
