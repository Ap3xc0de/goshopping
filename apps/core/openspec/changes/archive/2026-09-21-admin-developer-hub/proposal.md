# Proposal: admin-developer-hub

## Intent

Reorientar los módulos `Crear Tienda` y `Mi Tienda` del panel admin para que su único propósito sea exponer lo necesario para consumir la API pública: slug, URL base, gestión de API keys y ejemplos de conexión. El wizard de "crear tienda" es hoy un editor de branding muerto (la tienda se auto-crea al registrarse, `auth_service.go:82-119`), y "Mi Tienda" es un editor de colores/tipografías ajeno a la integración con la API. Se elimina el primero y se reescribe el segundo como "developer hub".

## Scope

### In Scope
- Eliminar por completo el módulo `Crear Tienda`: ruta `/dashboard/create-store`, sidebar entry y los componentes de `apps/admin/src/components/store-builder/` (wizard + branding/domain/template steps + previews) con sus tests.
- Reescribir `Mi Tienda` (`/dashboard/my-store`) para mostrar únicamente: slug de la tienda, URL base de la API + referencia de endpoints `/api/v1/:slug/*`, gestión de API keys (listar/crear/revocar, plaintext una sola vez) y snippet de conexión.
- Añadir endpoint mínimo en core: `GET /stores/:storeId` bajo JWT + `StoreContext` que devuelva `{id, name, slug}`.
- Limpiar código muerto en `apps/admin/src/lib/api.ts` y `lib/types.ts` (branding/template/domain) y quitar la dependencia `@goshopping/template-catalog` del admin.

### Out of Scope
- Backend de branding/template/domain en `apps/core` (queda intacto; lo usan `storefront` y `/public`).
- Migración de datos, cambios en `apps/storefront` o `apps/superadmin`.
- Limpieza de docs (`storefront-design-system.md`, `templates.md`) que aún describen el wizard — se registra como follow-up.

## Capabilities

### New Capabilities
- `admin-developer-hub`: UI del panel (Mi Tienda como hub de integración + eliminación de Crear Tienda).
- `store-owner-store-api`: endpoint seller-scoped `GET /stores/:storeId` que expone el slug.

### Modified Capabilities
- None

## Approach

Cambio aditivo y aislado a `apps/admin` + un endpoint core nuevo. El admin consume los endpoints de API keys ya existentes (`GET/POST/DELETE /stores/:storeId/api-keys`, working tree de `storefront-public-api-keys`) y el nuevo `GET /stores/:storeId` para el slug. La URL base se toma de `NEXT_PUBLIC_API_URL`, igual que el resto del panel.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/core/internal/router/router.go` | Modified | Registrar `store.Get("/", handlers.GetStore(db))`. |
| `apps/core/internal/handlers/` | New | `store.go` (o similar) con `GetStore` handler seller-safe. |
| `apps/core/internal/handlers/*_test.go` | New | Test del nuevo endpoint. |
| `apps/admin/src/app/dashboard/create-store/**` | Removed | Página + test. |
| `apps/admin/src/components/store-builder/**` | Removed | Wizard + todos sus componentes y tests. |
| `apps/admin/src/app/dashboard/my-store/page.tsx` | Rewritten | Developer hub (slug, URL base, API keys, snippet). |
| `apps/admin/src/components/layout/Sidebar.tsx` | Modified | Quitar nav item `Crear Tienda`. |
| `apps/admin/src/lib/api.ts` + `types.ts` | Modified | Quitar clientes/tipos de branding/template/domain; añadir `listAPIKeys/createAPIKey/revokeAPIKey/getStore`. |
| `apps/admin/src/lib/hooks/useBranding.ts`, `lib/color.ts` | Removed | Solo los usaba el editor de branding. |
| `apps/admin/package.json` | Modified | Quitar `@goshopping/template-catalog`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Los endpoints de API keys están en working tree sin commitear | High | Son funcionales en dev; se documenta la dependencia y no se commitea nada sin confirmar. |
| URL base de producción no confirmada (`vettacode.com` vs `goshopping.com`) | Med | Usar `NEXT_PUBLIC_API_URL`; el snippet es relativo a esa variable. |
| `BrandingStep` exporta `ALLOWED_FONTS` usado por my-store | Low | El nuevo page ya no necesita fuentes; se elimina la dependencia. |

## Rollback Plan

Revertir el commit/rama del cambio (los archivos eliminados están en historial Git). No hay migración de datos. El endpoint core nuevo es aditivo; se puede quitar sin impacto ocultando la ruta.

## Dependencies

- Endpoints de API keys existentes en `apps/core` (working tree de `storefront-public-api-keys`).
- Postgres local (`localhost:5434`) para ejecutar `make test-core`.

## Success Criteria

- [ ] `Crear Tienda` ya no aparece en el sidebar ni existe la ruta `/dashboard/create-store`.
- [ ] `/dashboard/my-store` muestra slug + URL base + lista/creación/revocación de API keys + snippet, sin editor de branding.
- [ ] `GET /stores/:storeId` devuelve `{id, name, slug}` para el owner (401 sin auth, 403 para tienda ajena).
- [ ] `jest` en admin y `make test-core` en core pasan en verde.
