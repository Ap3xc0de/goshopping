---
sidebar_position: 6
---

# Tabla: accounts

Usuarios del sistema. Cada persona que se registra crea una cuenta.

## DDL

```sql
CREATE TABLE accounts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    role         VARCHAR(20)  NOT NULL DEFAULT 'owner'
                     CHECK (role IN ('superadmin', 'owner')),
    status       VARCHAR(20)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_accounts_email ON accounts(email);
```

## Campos

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | UUID | Auto | Identificador único |
| `email` | VARCHAR(255) | Sí | Email único. Usado para login. |
| `password_hash` | VARCHAR(255) | Sí | bcrypt hash. Nunca se expone en APIs. |
| `name` | VARCHAR(255) | Sí | Nombre del usuario |
| `role` | VARCHAR(20) | Auto | `owner` (default al registrarse), `superadmin` (asignado manualmente) |
| `status` | VARCHAR(20) | Auto | `active`, `suspended`, `deleted` |

## Notas importantes

- El campo `password_hash` **nunca** se incluye en ninguna respuesta de API
- Al registrarse, el role es siempre `owner`. Los `superadmin` se crean manualmente en la BD.
- `status: deleted` es el "borrado suave". El registro permanece en la BD para auditoría.

## Relaciones

- `stores`: un account puede tener múltiples stores (owner)
- `store_users`: un account puede ser operador/viewer en stores de otros owners
