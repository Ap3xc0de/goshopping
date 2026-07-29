---
sidebar_position: 11
---

# Tabla: integrations

Configuración de integraciones externas por tienda.

## DDL

```sql
CREATE TABLE integrations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id     UUID NOT NULL REFERENCES stores(id),
    type         VARCHAR(50) NOT NULL
                     CHECK (type IN ('payment', 'accounting', 'shipping', 'marketing', 'notification')),
    provider     VARCHAR(50) NOT NULL,
    config       JSONB NOT NULL DEFAULT '{}',
    status       VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_integrations_store_type_provider 
    ON integrations(store_id, type, provider);
```

## Proveedores soportados

| type | provider | Descripción |
|---|---|---|
| `payment` | `wompi` | Pasarela de pagos (Colombia) |
| `payment` | `payu` | Pasarela de pagos alternativa |
| `accounting` | `siigo` | Facturación electrónica DIAN |
| `accounting` | `alegra` | Contabilidad alternativa |
| `shipping` | `servientrega` | Operador logístico Colombia |
| `marketing` | `meta` | Meta Pixel, CAPI |
| `marketing` | `google` | Google Analytics |
| `notification` | `twilio` | WhatsApp Business API |

## Estructura de config (JSONB)

:::caution Seguridad
Las credenciales en `config` deben estar encriptadas con `pgcrypto` antes de almacenarse. Esta feature se implementa en Etapa 5.
:::

Ejemplo para Wompi:
```json
{
  "public_key": "pub_test_...",
  "private_key": "prv_test_...",
  "events_key": "evt_test_...",
  "environment": "sandbox"
}
```

Ejemplo para Siigo:
```json
{
  "username": "email@empresa.com",
  "access_key": "...",
  "partner_id": "...",
  "company_id": "12345"
}
```
