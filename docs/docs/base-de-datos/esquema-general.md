---
sidebar_position: 1
---

# Esquema General de Base de Datos

Go Shopping usa **PostgreSQL 16** con 9 tablas organizadas en torno al modelo multi-tenant `store_id`.

## Diagrama ER

```mermaid
erDiagram
    accounts {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    stores {
        uuid id PK
        uuid account_id FK
        varchar name
        varchar slug UK
        varchar domain
        varchar status
        jsonb config
        timestamptz created_at
        timestamptz updated_at
    }

    store_users {
        uuid id PK
        uuid store_id FK
        uuid account_id FK
        varchar role
        timestamptz invited_at
    }

    products {
        uuid id PK
        uuid store_id FK
        varchar name
        varchar sku
        text description
        decimal price
        decimal cost
        integer stock
        integer min_stock
        varchar category
        jsonb images
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    customers {
        uuid id PK
        uuid store_id FK
        varchar name
        varchar email
        varchar phone
        jsonb address
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    orders {
        uuid id PK
        uuid store_id FK
        uuid customer_id FK
        varchar status
        jsonb items
        decimal subtotal
        decimal tax
        decimal total
        varchar payment_method
        varchar payment_ref
        varchar shipping_tracking
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    order_timeline {
        uuid id PK
        uuid order_id FK
        varchar status
        uuid changed_by FK
        text notes
        timestamptz created_at
    }

    integrations {
        uuid id PK
        uuid store_id FK
        varchar type
        varchar provider
        jsonb config
        varchar status
        timestamptz last_sync_at
        timestamptz created_at
        timestamptz updated_at
    }

    audit_log {
        uuid id PK
        uuid account_id FK
        uuid store_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        jsonb details
        varchar ip
        timestamptz created_at
    }

    accounts ||--o{ stores : "posee"
    accounts ||--o{ store_users : "pertenece a"
    stores ||--o{ store_users : "tiene"
    stores ||--o{ products : "tiene"
    stores ||--o{ customers : "tiene"
    stores ||--o{ orders : "tiene"
    stores ||--o{ integrations : "tiene"
    stores ||--o{ audit_log : "genera"
    customers ||--o{ orders : "realiza"
    orders ||--o{ order_timeline : "tiene"
    accounts ||--o{ order_timeline : "modifica"
    accounts ||--o{ audit_log : "genera"
```

## Resumen de tablas

| Tabla | Registros típicos | Descripción |
|---|---|---|
| `accounts` | Pequeño | Usuarios del sistema (dueños, operadores, superadmins) |
| `stores` | Pequeño | Tiendas por account |
| `store_users` | Pequeño | Relación many-to-many accounts ↔ stores |
| `products` | Mediano | Catálogo de cada tienda |
| `customers` | Grande | Clientes por tienda |
| `orders` | Grande | Pedidos con estado y líneas |
| `order_timeline` | Grande | Historial de cambios de estado de pedidos |
| `integrations` | Pequeño | Config de integraciones externas por tienda |
| `audit_log` | Muy grande | Log inmutable de acciones sensibles |

## Extensiones habilitadas

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_bytes() para tokens
```
