-- Revert JSONB key rename: product_name → name, unit_price → price
UPDATE orders
SET items = (
    SELECT COALESCE(
        jsonb_agg(
            item
            - 'product_name'
            - 'unit_price'
            || jsonb_build_object(
                'name',  COALESCE(item->>'name',  item->>'product_name', ''),
                'price', COALESCE(item->>'price', item->>'unit_price',   '0')
            )
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(items) AS item
)
WHERE items::text <> '[]';
