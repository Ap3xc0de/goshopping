CREATE TABLE coupons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    code            VARCHAR(20) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
    discount_value  DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
    usage_type      VARCHAR(20) NOT NULL DEFAULT 'cart' CHECK (usage_type IN ('line','cart')),
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    usage_limit     INTEGER,
    used_count      INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, code),
    CHECK (discount_type <> 'percentage' OR discount_value <= 100),
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
    CHECK (usage_limit IS NULL OR usage_limit > 0)
);

CREATE INDEX idx_coupons_store_code ON coupons(store_id, code);
CREATE INDEX idx_coupons_store_active ON coupons(store_id, status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE coupon_usage (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id       UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(coupon_id, order_id)
);
