-- 011_storefront_commerce — catalog, variants, shipping, newsletter (storefront-complete-commerce-api).
-- Additive-only: new tables, new nullable/defaulted columns, new indexes.
-- Reversible: 011_storefront_commerce.down.sql drops everything created here in reverse order.

-- Accent-insensitive search (catalog-browsing REQ: Accent-Insensitive Search).
-- Both extensions are "trusted" (postgres 13+), so the goshopping role can create them.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Postgres marks unaccent() as STABLE, so it cannot appear in an index
-- expression directly (SQLSTATE 42P17). The wrapper below is the canonical
-- workaround: an IMMUTABLE SQL function calling unaccent() with an explicit
-- dictionary, used by BOTH the search index and the ListProducts query so the
-- planner matches the expression exactly. Dropped in the down migration.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- ── Categories (self-referencing tree) ─────────────────────────────────────────

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES categories(id),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

CREATE INDEX idx_categories_store_parent ON categories(store_id, parent_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Product variants ────────────────────────────────────────────────────────────
-- store_id deviates from the delta spec (which scopes variants only via product):
-- the multi-tenant binding constraint applies to every new table, store_id FK
-- ON DELETE CASCADE included (design decision 5).

CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL,
    size            VARCHAR(50),
    color           VARCHAR(50),
    price_override  DECIMAL(12,2) CHECK (price_override IS NULL OR price_override >= 0),
    stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, sku)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Shipping zones + methods ────────────────────────────────────────────────────

CREATE TABLE shipping_zones (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON shipping_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE shipping_methods (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    zone_id     UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    base_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
    weight_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, code)
);

CREATE INDEX idx_methods_zone ON shipping_methods(zone_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON shipping_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Newsletter subscribers ──────────────────────────────────────────────────────

CREATE TABLE newsletter_subscribers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, email)
);

-- ── Product / order columns (design decision 1 + slice 3 pre-staging) ───────────

-- weight is in kg (NUMERIC(8,3): 1 g precision, max 99999.999 kg). See design.md
-- decision 1: shipping_total = base_price + weight_total_kg × weight_rate.
ALTER TABLE products ADD COLUMN weight NUMERIC(8,3) NOT NULL DEFAULT 0;
-- category_id points at the new categories tree; ON DELETE SET NULL keeps a
-- deleted category from blocking/orphaning products (products fall back to the
-- legacy flat products.category string, kept populated during the transition).
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Shipping cost + record currency (slice 3 consumes these; columns are inert until then).
ALTER TABLE orders ADD COLUMN shipping_method TEXT NULL;
ALTER TABLE orders ADD COLUMN shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD';

-- ── Search index ─────────────────────────────────────────────────────────────────
-- Expression index matching the ListProducts search expression exactly:
-- public.immutable_unaccent(COALESCE(name,'')||' '||COALESCE(sku,'')||' '||COALESCE(description,''))
-- ILIKE '%'||$1||'%' ESCAPE '\', user input escaped (% _ \). ILIKE stays as
-- non-indexed fallback for small catalogs; the trigram GIN index accelerates it.
CREATE INDEX idx_products_search_trgm ON products
    USING gin (public.immutable_unaccent(COALESCE(name,'') || ' ' || COALESCE(sku,'') || ' ' || COALESCE(description,'')) gin_trgm_ops);

CREATE INDEX idx_products_store_category_id ON products(store_id, category_id);
