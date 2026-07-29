-- Rename JSONB keys in orders.items: name → product_name, price → unit_price
-- Idempotent: uses COALESCE so existing product_name/unit_price keys are preserved.
UPDATE orders
SET items = (
    SELECT COALESCE(
        jsonb_agg(
            item
            - 'name'
            - 'price'
            || jsonb_build_object(
                'product_name', COALESCE(item->>'product_name', item->>'name', ''),
                'unit_price',   COALESCE(item->>'unit_price',   item->>'price',  '0')
            )
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(items) AS item
)
WHERE items::text <> '[]';
