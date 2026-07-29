---
sidebar_position: 9
---

# Tabla: products

Catálogo de productos por tienda.

## DDL

```sql
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id    UUID NOT NULL REFERENCES stores(id),
    name        VARCHAR(255) NOT NULL,
    sku         VARCHAR(100),
    description TEXT,
    price       DECIMAL(12,2) NOT NULL,
    cost        DECIMAL(12,2),
    stock       INTEGER NOT NULL DEFAULT 0,
    min_stock   INTEGER NOT NULL DEFAULT 0,
    category    VARCHAR(100),
    images      JSONB NOT NULL DEFAULT '[]',
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'out_of_stock', 'deleted')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store_id       ON products(store_id);
CREATE INDEX idx_products_store_status   ON products(store_id, status);
CREATE INDEX idx_products_store_category ON products(store_id, category);
CREATE UNIQUE INDEX idx_products_store_sku ON products(store_id, sku) 
    WHERE sku IS NOT NULL;
```

## Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `sku` | VARCHAR(100) | Código del producto. Único por tienda. Nullable. |
| `price` | DECIMAL(12,2) | Precio de venta en centavos (COP: sin decimales en práctica) |
| `cost` | DECIMAL(12,2) | Costo del producto. Nullable. Usado para calcular margen. |
| `stock` | INTEGER | Cantidad disponible. Decrementar al confirmar pedido. |
| `min_stock` | INTEGER | Alerta cuando `stock <= min_stock` |
| `images` | JSONB | Array de imágenes |
| `status` | VARCHAR | `active`, `inactive`, `out_of_stock`, `deleted` |

## Estructura de images (JSONB)

```json
[
  {
    "url": "https://cdn.goshopping.co/stores/abc/products/xyz-1.jpg",
    "alt": "Camiseta azul - vista frontal",
    "order": 1
  },
  {
    "url": "https://cdn.goshopping.co/stores/abc/products/xyz-2.jpg",
    "alt": "Camiseta azul - vista trasera",
    "order": 2
  }
]
```

## Notas

- El `sku` es único **por tienda** (UNIQUE INDEX con `store_id`), no globalmente.
- `status: 'out_of_stock'` se puede usar para productos temporalmente sin stock que sí deben aparecer en el catálogo.
- Gestión de stock: en Etapa 1, el stock se decrementa manualmente. En Etapa 3+ se automatizará al confirmar un pedido.
