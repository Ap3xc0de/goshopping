CREATE TABLE store_domains (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id               UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    hostname               VARCHAR(255) NOT NULL,
    kind                   VARCHAR(20)  NOT NULL DEFAULT 'generic' CHECK (kind IN ('generic','custom')),
    status                 VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('pending','verifying','active','failed')),
    is_primary             BOOLEAN      NOT NULL DEFAULT false,
    cloudflare_hostname_id VARCHAR(255),
    verified_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (hostname)
);

CREATE INDEX idx_store_domains_store_id ON store_domains(store_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON store_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at();
