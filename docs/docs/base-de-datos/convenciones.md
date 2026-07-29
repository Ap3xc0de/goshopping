---
sidebar_position: 4
---

# Convenciones de Base de Datos

## IDs: UUID v4

Todos los IDs son `UUID v4`, nunca `SERIAL` ni `BIGINT`.

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Por qué**:
- Sin colisiones en multi-tenant (dos tiendas pueden tener el `product_id` 1, pero nunca el mismo UUID)
- Sin deducción de volumen (un competidor no puede adivinar cuántos pedidos tienes por el ID)
- Replicación distribuida sin conflictos

## Timestamps: TIMESTAMPTZ

Todos los timestamps son `TIMESTAMPTZ` (with timezone), nunca `TIMESTAMP`.

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Por qué**: Go Shopping opera en múltiples países de Latam. `TIMESTAMP` sin timezone causa bugs al consultar datos de usuarios en zonas horarias distintas.

## Soft Deletes: campo `status`

Go Shopping NO usa `deleted_at` ni `is_deleted`. En cambio, usa un campo `status` con un valor `'deleted'`.

```sql
status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'out_of_stock', 'deleted'))
```

**Por qué**: permite auditoría (¿cuándo se "borró"?), recuperación de registros, y queries de reportes históricos.

**Siempre filtrar en queries**:
```sql
-- ✅ Correcto
SELECT * FROM products WHERE store_id = $1 AND status != 'deleted'

-- ❌ Incorrecto — muestra productos eliminados
SELECT * FROM products WHERE store_id = $1
```

## JSONB para datos flexibles

Campos `config`, `images`, `items`, `address` son `JSONB`.

| Campo | Tabla | Estructura típica |
|---|---|---|
| `config` | `stores` | `{"currency": "COP", "timezone": "America/Bogota", "tax_rate": 0.19}` |
| `images` | `products` | `[{"url": "s3://...", "alt": "...", "order": 1}]` |
| `items` | `orders` | `[{"product_id": "...", "name": "...", "qty": 2, "price": 25000}]` |
| `address` | `customers` | `{"street": "...", "city": "Bogotá", "department": "Cundinamarca", "zip": "110111"}` |
| `config` | `integrations` | `{"api_key": "...", "company_id": "...", "environment": "production"}` |

**Precaución**: las credenciales en `integrations.config` deben estar encriptadas con `pgcrypto` antes de almacenarse. Implementado en Etapa 5.

## Naming: snake_case

Todas las tablas y columnas usan `snake_case`:
- `store_users` ✅ (no `storeUsers`, no `StoreUsers`)
- `created_at` ✅ (no `createdAt`)
- `order_id` ✅ (no `orderId`)

## Trigger update_updated_at

Todas las tablas con `updated_at` tienen un trigger que lo actualiza automáticamente:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Índices

Índices creados en la migración inicial:

```sql
-- Acceso por account en stores
CREATE INDEX idx_stores_account_id ON stores(account_id);

-- Búsqueda de tienda por slug (login público)
CREATE INDEX idx_stores_slug ON stores(slug);

-- Productos por tienda (query más frecuente)
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_store_status ON products(store_id, status);
CREATE INDEX idx_products_store_category ON products(store_id, category);

-- Pedidos (alta frecuencia + ordenamiento)
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_store_created ON orders(store_id, created_at DESC);

-- Audit log (consultas por fecha descendente)
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```
