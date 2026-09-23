# Tasks: admin-developer-hub

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1800–2200 (mayoría eliminaciones) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 core endpoint → PR2 admin removal+rewrite |
| Delivery strategy | single-pr (usuario modo auto; sin commit solicitado) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

## Phase 1: Core endpoint (foundation)

- [x] 1.1 RED — `apps/core/internal/handlers/store_test.go`: tests `GetStore` (200 owner con slug, 401 sin auth, 403 cross-owner, 404 inexistente, sin campos sensibles).
- [x] 1.2 GREEN — `apps/core/internal/handlers/store.go`: handler `GetStore(db)` con query `SELECT id,name,slug` y DTO `storeInfoResponse{id,name,slug}`.
- [x] 1.3 GREEN — `apps/core/internal/router/router.go`: registrar `store.Get("/", handlers.GetStore(db))`.
- [x] 1.4 Ejecutar `make test-core` (handlers) en verde.

## Phase 2: Admin client foundation

- [x] 2.1 `apps/admin/src/lib/types.ts`: añadir `StoreAPIKey`; eliminar `BrandColors/BrandFonts/StoreDomain/StoreBranding`.
- [x] 2.2 `apps/admin/src/lib/api.ts`: añadir `getStore/listAPIKeys/createAPIKey/revokeAPIKey`; eliminar `updateStoreTemplate/getStoreDomain/getBranding/updateBranding` y sus imports.
- [x] 2.3 `apps/admin/package.json`: quitar `@goshopping/template-catalog`.

## Phase 3: Remove Crear Tienda

- [x] 3.1 Eliminar `apps/admin/src/app/dashboard/create-store/` (página + test).
- [x] 3.2 Eliminar `apps/admin/src/components/store-builder/` (wizard + componentes + tests).
- [x] 3.3 Eliminar `apps/admin/src/lib/hooks/useBranding.ts` + test; `apps/admin/src/lib/color.ts` + test.
- [x] 3.4 `apps/admin/src/components/layout/Sidebar.tsx`: quitar nav item `Crear Tienda` + import `Sparkles`; actualizar `Sidebar.test.tsx` (asertar ausencia).

## Phase 4: Rewrite Mi Tienda

- [x] 4.1 RED — `apps/admin/src/app/dashboard/my-store/__tests__/page.test.tsx`: assert slug, URL base + `/api/v1/:slug`, listar/crear/revocar keys (plaintext una vez), snippet; y ausencia de branding/preview.
- [x] 4.2 GREEN — `apps/admin/src/app/dashboard/my-store/page.tsx`: reescribir como developer hub.

## Phase 5: Verification

- [x] 5.1 `npm run test -- --runInBand` (admin, jest) en verde.
- [x] 5.2 `make test-core` en verde.
- [x] 5.3 `npm run build` (admin) sin errores TS.
