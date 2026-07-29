---
sidebar_position: 12
---

# Tabla: audit_log

Log inmutable de acciones sensibles. Nunca se borra ni modifica.

## DDL

```sql
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id  UUID REFERENCES accounts(id),
    store_id    UUID REFERENCES stores(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB NOT NULL DEFAULT '{}',
    ip          VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_account_id ON audit_log(account_id);
CREATE INDEX idx_audit_log_store_id   ON audit_log(store_id);
CREATE INDEX idx_audit_log_created    ON audit_log(created_at DESC);
```

## Acciones registradas

| action | entity_type | Descripción |
|---|---|---|
| `auth.login` | `account` | Login exitoso |
| `auth.login_failed` | `account` | Intento de login fallido |
| `auth.register` | `account` | Nuevo registro |
| `auth.refresh` | `account` | Token refrescado |
| `store.created` | `store` | Tienda creada |
| `store.updated` | `store` | Tienda modificada |
| `product.created` | `product` | Producto creado |
| `product.deleted` | `product` | Producto eliminado |
| `order.status_changed` | `order` | Estado de pedido cambiado |
| `integration.connected` | `integration` | Integración activada |
| `integration.disconnected` | `integration` | Integración desactivada |

## Estructura de details

```json
{
  "previous_status": "pending",
  "new_status": "confirmed",
  "changed_by": "uuid-del-operador",
  "note": "Pago confirmado via Wompi"
}
```

## Notas de diseño

- No tiene `updated_at` ni `deleted_at`. Es **append-only**.
- `account_id` y `store_id` son nullable para registrar eventos de sistema (ej: migrations).
- `ip` puede ser IPv4 o IPv6 (VARCHAR(45) soporta ambos).
- En producción, esta tabla tendrá millones de filas. El índice en `created_at DESC` es crítico para queries de listado reciente.
