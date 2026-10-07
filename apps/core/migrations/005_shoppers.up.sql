-- Shoppers (Cognito-authenticated marketplace users), keyed by Cognito sub.
CREATE TABLE shoppers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_sub TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'cognito',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON shoppers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
