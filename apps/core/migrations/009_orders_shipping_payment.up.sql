ALTER TABLE orders ADD COLUMN shipping_address JSONB NULL;
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
