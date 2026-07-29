---
sidebar_position: 4
---

# Paginación

Todos los endpoints que retornan listas usan paginación por **offset**.

## Query parameters

| Parámetro | Tipo | Default | Máximo | Descripción |
|---|---|---|---|---|
| `page` | integer | 1 | - | Número de página (base 1) |
| `limit` | integer | 20 | 100 | Resultados por página |

## Ejemplo

```http
GET /stores/abc/products?page=2&limit=50
```

## Estructura de respuesta

```json
{
  "data": [
    { "id": "...", "name": "Producto 1", ... },
    { "id": "...", "name": "Producto 2", ... }
  ],
  "meta": {
    "page": 2,
    "limit": 50,
    "total": 230,
    "total_pages": 5
  }
}
```

| Campo meta | Descripción |
|---|---|
| `page` | Página actual |
| `limit` | Cantidad solicitada |
| `total` | Total de registros que coinciden con los filtros |
| `total_pages` | ceil(total / limit) |

## Filtros disponibles por endpoint

### GET /stores/:id/products

| Param | Tipo | Descripción |
|---|---|---|
| `status` | string | Filtrar por status: `active`, `inactive`, `out_of_stock` |
| `category` | string | Filtrar por categoría |
| `search` | string | Búsqueda por nombre o SKU (ILIKE) |

### GET /stores/:id/orders

| Param | Tipo | Descripción |
|---|---|---|
| `status` | string | Filtrar por status del pedido |
| `from` | date | Pedidos desde esta fecha (ISO 8601) |
| `to` | date | Pedidos hasta esta fecha (ISO 8601) |

### GET /stores/:id/customers

| Param | Tipo | Descripción |
|---|---|---|
| `search` | string | Búsqueda por nombre, email o teléfono |
