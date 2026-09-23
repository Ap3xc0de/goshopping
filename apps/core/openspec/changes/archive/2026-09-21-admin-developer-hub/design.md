# Design: admin-developer-hub

## Technical Approach

Dos frentes aislados: (1) un endpoint core aditivo `GET /stores/:storeId` que rellena el vacío del slug, y (2) el rewrite del frontend admin que elimina `Crear Tienda` y convierte `Mi Tienda` en el hub de integración. El frontend consume los endpoints de API keys ya existentes y el nuevo endpoint de slug.

## Architecture Decisions

| Decision | Alternative(s) | Rationale |
|---|---|---|
| Nuevo endpoint seller-scoped `GET /stores/:storeId` bajo `store` group (`StoreContext`) | (a) meter slug en el JWT `stores` claim, (b) derivar slug del hostname de `/stores/:storeId/domain` | (a) requiere regenerar tokens y tocar auth; (b) frágil (depende del sufijo de dominio y orden multi-dominio). El endpoint es mínimo, aditivo y reusa `StoreContext` que ya autoriza (403/404). |
| Handler con query directa `SELECT id, name, slug FROM stores WHERE id=$1` devolviendo DTO recortado | Devolver `models.Store` completo | `models.Store` serializa `owner_id`, `template_id`, etc. El DTO protege campos sensibles (cumple el escenario "no sensitive fields"). Sigue el patrón de `handlers.GetStoreDomain(db)`. |
| El admin muestra la URL base desde `NEXT_PUBLIC_API_URL` (misma que ya usa `lib/api.ts`) | Hardcodear dominio de producción | El dominio de prod no está confirmado (`vettacode.com` vs `goshopping.co`); la variable ya es la fuente de verdad del cliente. |
| Nuevos métodos de cliente `getStore/listAPIKeys/createAPIKey/revokeAPIKey` en `lib/api.ts` | Servidor propio o proxy | Mismos síncronos de `request()` existentes; los endpoints ya existen en core. |

## Data Flow

```
mi-store/page.tsx
  ├── useStore()  ── JWT stores[0] ── storeId
  ├── api.getStore(storeId)  ── GET /stores/:storeId ── {id, name, slug}
  └── api.listAPIKeys(storeId) ── GET /stores/:storeId/api-keys ── keys[]
        api.createAPIKey(storeId,{name}) ── POST ── {api_key, plaintext}
        api.revokeAPIKey(storeId,keyId) ── DELETE ── 204
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/core/internal/handlers/store.go` | Create | `GetStore(db)` handler: `SELECT id,name,slug` + 404, DTO `{id,name,slug}`. |
| `apps/core/internal/router/router.go` | Modify | `store.Get("/", handlers.GetStore(db))`. |
| `apps/core/internal/handlers/store_test.go` | Create | 200 owner, 401, 403 cross-owner, 404. |
| `apps/admin/src/app/dashboard/my-store/page.tsx` | Rewrite | Hub: slug, URL base + endpoints, API keys CRUD, snippet. |
| `apps/admin/src/app/dashboard/my-store/__tests__/page.test.tsx` | Rewrite | Assert slug/base/keys/snippet; no branding. |
| `apps/admin/src/app/dashboard/create-store/**` | Delete | Página + test. |
| `apps/admin/src/components/store-builder/**` | Delete | Wizard + componentes + tests. |
| `apps/admin/src/components/layout/Sidebar.tsx` | Modify | Quitar nav `Crear Tienda` + import `Sparkles`. |
| `apps/admin/src/components/layout/__tests__/Sidebar.test.tsx` | Verify | Ya solo asevera Mi Tienda; añadir aserción de ausencia de Crear Tienda. |
| `apps/admin/src/lib/api.ts` | Modify | +`getStore` +`listAPIKeys` +`createAPIKey` +`revokeAPIKey`; −`updateStoreTemplate` −`getStoreDomain` −`getBranding` −`updateBranding`. |
| `apps/admin/src/lib/types.ts` | Modify | +`StoreAPIKey`; −`BrandColors` −`BrandFonts` −`StoreDomain` −`StoreBranding`. |
| `apps/admin/src/lib/hooks/useBranding.ts` (+test) | Delete | Solo lo usaba el editor. |
| `apps/admin/src/lib/color.ts` (+test) | Delete | Solo branding. |
| `apps/admin/package.json` | Modify | Quitar `@goshopping/template-catalog`. |

## Interfaces / Contracts

```go
// handlers/store.go — seller-safe DTO
type storeInfoResponse struct {
    ID   string `json:"id"`
    Name string `json:"name"`
    Slug string `json:"slug"`
}
```

```ts
// lib/types.ts
export interface StoreAPIKey {
  id: string; name: string; prefix: string; active: boolean;
  last_used_at?: string; expires_at?: string;
  created_at: string; revoked_at?: string;
}
// lib/api.ts
getStore(storeId): Promise<{ id: string; name: string; slug: string }>
listAPIKeys(storeId): Promise<StoreAPIKey[]>
createAPIKey(storeId, name): Promise<{ api_key: string; plaintext: string }>
revokeAPIKey(storeId, keyId): Promise<void>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Core integration | `GET /stores/:storeId` 200/401/403/404 + no sensitive fields | `testutil.SetupTestApp` + `OwnerAuthHeader` + `AssertStatus`/`AssertJSON`. |
| Admin unit (RTL) | Mi Tienda renderiza slug/base/keys/snippet; sin branding | `jest.mock('@/lib/api')` + `jest.mock('@/lib/hooks/useStore')` (patrón existente). |
| Admin unit (RTL) | Sidebar sin Crear Tienda | Actualizar `Sidebar.test.tsx`. |

## Migration / Rollout

No migration required.

## Open Questions

- Ninguna que bloquee. (Follow-up: limpiar docs que aún describen el wizard y confirmar dominio de producción.)
