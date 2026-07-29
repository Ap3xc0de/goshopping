---
sidebar_position: 10
---

# Tabla: customers

Clientes registrados por tienda.

## DDL

```sql
CREATE TABLE customers (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id   UUID NOT NULL REFERENCES stores(id),
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(50),
    address    JSONB NOT NULL DEFAULT '{}',
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_store_email ON customers(store_id, email) 
    WHERE email IS NOT NULL;
```

## Estructura de address (JSONB)

```json
{
  "street": "Calle 123 # 45-67",
  "neighborhood": "Chapinero",
  "city": "Bogotá",
  "department": "Cundinamarca",
  "zip": "110111",
  "country": "CO",
  "references": "Edificio azul, apto 301"
}
```

## Notas

- Los clientes son **por tienda**. El mismo cliente puede existir en múltiples tiendas como registros separados.
- Email y phone son opcionales. Muchas ventas en Colombia son por WhatsApp sin email registrado.
- `notes` es texto libre para el operador (ej: "Cliente prefiere entrega en la tarde").
