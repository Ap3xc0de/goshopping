---
sidebar_position: 7
---

# Tabla: stores

Tiendas. Cada account puede tener una o más tiendas.

## DDL

```sql
CREATE TABLE stores (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    domain     VARCHAR(255),
    status     VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    config     JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_account_id ON stores(account_id);
CREATE UNIQUE INDEX idx_stores_slug ON stores(slug);
```

## Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único de la tienda |
| `account_id` | UUID FK | Owner de la tienda |
| `name` | VARCHAR | Nombre visible de la tienda |
| `slug` | VARCHAR(100) | Identificador URL único: `mi-tienda` → `goshopping.co/mi-tienda` |
| `domain` | VARCHAR | Dominio personalizado (ej: `www.mitienda.com`) — nullable |
| `status` | VARCHAR | Estado de la tienda |
| `config` | JSONB | Configuración de la tienda |

## Estructura del campo config

```json
{
  "currency": "COP",
  "timezone": "America/Bogota",
  "tax_rate": 0.19,
  "whatsapp": "+573001234567",
  "logo_url": "https://cdn.goshopping.co/logos/mi-tienda.png",
  "address": {
    "city": "Bogotá",
    "department": "Cundinamarca"
  }
}
```

## Notas

- Al registrarse, Go Shopping crea automáticamente la primera tienda del account con el name del account.
- El `slug` se genera a partir del name en minúsculas, reemplazando espacios por `-` y eliminando caracteres especiales.
- Si el slug generado ya existe, se agrega un sufijo numérico (`mi-tienda-2`).
