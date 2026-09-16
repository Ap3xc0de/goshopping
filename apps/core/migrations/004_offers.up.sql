CREATE TABLE offers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
    discount_value  DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
    scope           VARCHAR(20) NOT NULL DEFAULT 'store' CHECK (scope IN ('store','category','product')),
    scope_value     VARCHAR(255),
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (scope = 'store' OR scope_value IS NOT NULL),
    CHECK (discount_type <> 'percentage' OR discount_value <= 100),
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_offers_store_id ON offers(store_id);
CREATE INDEX idx_offers_store_active_window ON offers(store_id, status, starts_at, ends_at);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
