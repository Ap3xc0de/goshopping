# store-owner-store-api Specification

## Purpose

Endpoint seller-facing que devuelve la información básica de la tienda del propio vendedor, incluido el `slug`, para poder construir URLs contra la API pública (`/api/v1/:slug/*`). Hoy el slug solo es accesible por superadmin (`/admin/stores/:storeId`).

## Requirements

### Requirement: Seller Store Info Endpoint

El sistema MUST exponer `GET /stores/:storeId` bajo autenticación JWT y middleware `StoreContext`. Debe devolver una vista segura de la tienda con `id`, `name` y `slug`.

#### Scenario: Owner fetches own store info

- GIVEN un usuario autenticado dueño de la tienda `{storeId}`
- WHEN llama a `GET /stores/{storeId}`
- THEN recibe HTTP 200 con JSON `{"id": "{storeId}", "name": "...", "slug": "..."}`
- AND el `slug` es el mismo registrado en la tabla `stores`

#### Scenario: Unauthenticated request

- GIVEN una petición sin token JWT válido
- WHEN llama a `GET /stores/{storeId}`
- THEN recibe HTTP 401

#### Scenario: Non-owner store access

- GIVEN un usuario autenticado que NO pertenece a la tienda `{storeId}`
- WHEN llama a `GET /stores/{storeId}`
- THEN recibe HTTP 403

#### Scenario: Unknown store id

- GIVEN un `storeId` inexistente
- WHEN un superadmin llama a `GET /stores/{storeId}`
- THEN recibe HTTP 404

### Requirement: Seller Store Info Shape

La respuesta MUST contener únicamente `id`, `name` y `slug` (strings) y MUST NOT exponer campos sensibles o internos de la tienda.

#### Scenario: Response contains no sensitive fields

- GIVEN una tienda válida
- WHEN el owner llama a `GET /stores/{storeId}`
- THEN la respuesta no incluye `owner_id`, `template_id`, ni tokens
