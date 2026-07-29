---
sidebar_position: 1
---

# API Overview

El **Core API** es el único punto de entrada para todas las operaciones de negocio.

## Base URL

| Entorno | URL |
|---|---|
| Desarrollo local | `http://127.0.0.1:3000` |
| Staging | `https://api.staging.goshopping.co` |
| Producción | `https://api.goshopping.co` |

## Estilo REST

La API sigue convenciones REST estrictas:

| Método | Semántica |
|---|---|
| `GET` | Leer. Sin efectos secundarios. |
| `POST` | Crear. Devuelve 201 Created con el recurso creado. |
| `PUT` | Reemplazar completamente. |
| `PATCH` | Actualizar parcialmente. |
| `DELETE` | Eliminar (soft delete). |

## Headers requeridos

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

El `Authorization` header es obligatorio en todas las rutas excepto:
- `POST /auth/register`
- `POST /auth/login`  
- `POST /auth/refresh`
- `GET /health`
- `GET /public/*` (Storefront público)

## Versiones de la API

Actualmente la API no usa versioning en la URL. Cuando se introduzcan breaking changes, se utilizará el prefijo `/v2/`.

## Estructura de respuesta

### Respuesta exitosa

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

*`meta` solo aparece en respuestas paginadas.*

### Respuesta de error

```json
{
  "error": "Descripción del error para el cliente",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "issue": "invalid format"
  }
}
```

## Rutas disponibles en Etapa 1

```
GET  /health
POST /auth/register
POST /auth/login
POST /auth/refresh

GET  /stores/:store_id/products
POST /stores/:store_id/products
GET  /stores/:store_id/products/:id
PUT  /stores/:store_id/products/:id
DELETE /stores/:store_id/products/:id

GET  /stores/:store_id/customers
POST /stores/:store_id/customers
GET  /stores/:store_id/customers/:id
PUT  /stores/:store_id/customers/:id

GET  /stores/:store_id/orders
POST /stores/:store_id/orders
GET  /stores/:store_id/orders/:id
PATCH /stores/:store_id/orders/:id/status

GET  /public/:slug/products    (sin auth)
GET  /public/:slug/products/:id (sin auth)

GET  /superadmin/stores        (solo superadmin)
GET  /superadmin/accounts      (solo superadmin)
```
