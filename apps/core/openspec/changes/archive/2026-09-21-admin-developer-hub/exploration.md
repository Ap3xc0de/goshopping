# Exploration: admin-developer-hub

Date: 2026-09-21

## Current State

The `apps/admin` Next.js 14 App Router panel is a seller-facing admin with these modules in the sidebar (`apps/admin/src/components/layout/Sidebar.tsx:21-30`): Dashboard, Pedidos, Productos, Clientes, Reportes, **Crear Tienda** (`/dashboard/create-store`), **Mi Tienda** (`/dashboard/my-store`), Configuracion.

Two modules are being reoriented:

1. **Crear Tienda** — a 2-step "create store" wizard under `apps/admin/src/components/store-builder/` (CreateStoreWizard, BrandingStep, DomainStep, ColorPicker, StorePreview, MiTiendaPreview). Note this wizard no longer performs any real store provisioning: since a previous archived change (sdd/storefront-single-template-ecommerce), every account already gets a store auto-created at registration (`auth_service.go:82-119`), so the wizard is a dead branding editor.

2. **Mi Tienda** — today a full branding editor (colors/fonts/radius + live preview) built on `useBranding` + `@goshopping/template-catalog`. Its page (`apps/admin/src/app/dashboard/my-store/page.tsx`) is ~267 lines of color/font/radius form UI plus a `MiTiendaPreview` live preview.

### Auth / store context (admin)

- `apps/admin/src/lib/hooks/useAuth.tsx` — login/register both `router.push('/dashboard')` on success (lines 69, 80). No redirect to create-store anywhere.
- `apps/admin/src/app/page.tsx` — root redirects to `/dashboard` if token present, else `/login` (lines 11-15).
- `apps/admin/src/app/dashboard/layout.tsx:16-18` — redirects to `/login` when no account.
- `apps/admin/src/lib/hooks/useStore.ts` — derives `storeId`/`storeName` from JWT claim `stores[0]` (lines 27-52). Returns only `storeId`, `storeName`, `stores` (interface at lines 8-12). **No slug, no domain.**
- `apps/admin/src/lib/hooks/useBranding.ts` — fetches `GET /stores/:storeId/branding`; only consumer is my-store.

### Core backend (apps/core)

- Public developer API v1 group mounted in `apps/core/internal/router/router.go:52-58`: `/api/v1/:storeSlug` with `middleware.RequireAPIKey(apiKeySvc)`, reusing the `/public` handlers (config, products, products/:productId, quote, orders, orders/:orderId/status).
- API key admin endpoints already wired (`router.go:119-121`): `GET/POST /stores/:storeId/api-keys`, `DELETE /stores/:storeId/api-keys/:keyId` — uncommitted working-tree code from archived change `2026-09-17-storefront-public-api-keys`.
- `GET /admin/stores/:storeId` is superadmin-only (`router.go:129-136` + `middleware.RequireSuperAdmin`). The seller-facing admin has no endpoint that returns the store row (incl. slug).

## Deletion Set (create-store)

### Files to DELETE entirely

- `apps/admin/src/app/dashboard/create-store/page.tsx` — entry page (renders CreateStoreWizard).
- `apps/admin/src/app/dashboard/create-store/__tests__/page.test.tsx`.
- `apps/admin/src/components/store-builder/CreateStoreWizard.tsx`.
- `apps/admin/src/components/store-builder/BrandingStep.tsx` (also exports `ALLOWED_FONTS` consumed by my-store — see below).
- `apps/admin/src/components/store-builder/DomainStep.tsx`.
- `apps/admin/src/components/store-builder/ColorPicker.tsx`.
- `apps/admin/src/components/store-builder/StorePreview.tsx`.
- `apps/admin/src/components/store-builder/MiTiendaPreview.tsx`.
- `apps/admin/src/components/store-builder/__tests__/CreateStoreWizard.test.tsx`.
- `apps/admin/src/components/store-builder/__tests__/BrandingStep.test.tsx`.
- `apps/admin/src/components/store-builder/__tests__/ColorPicker.test.tsx`.
- `apps/admin/src/components/store-builder/__tests__/DomainStep.test.tsx`.
- `apps/admin/src/components/store-builder/__tests__/StorePreview.test.tsx`.
- `apps/admin/src/components/store-builder/__tests__/MiTiendaPreview.test.tsx`.
- `apps/admin/src/components/store-builder/__tests__/legacy-flow-removed.test.ts`.

### Hooks / lib / types to DELETE

- `apps/admin/src/lib/hooks/useBranding.ts` and `apps/admin/src/lib/hooks/__tests__/useBranding.test.ts`.
- `apps/admin/src/lib/color.ts` and `apps/admin/src/lib/__tests__/color.test.ts` (only used by my-store + ColorPicker).
- Types (in `apps/admin/src/lib/types.ts`): `BrandColors` (47-64), `BrandFonts` (66-69), `StoreDomain` (72-77), `StoreBranding` (79-88). The `Store` interface (31-43) already has `slug` and must be KEPT (useful for the new page).

### lib/api.ts methods to DELETE (dead client APIs)

- `updateStoreTemplate` (`api.ts:145-150`).
- `getStoreDomain` (`api.ts:153-155`).
- `getBranding` (`api.ts:158-160`).
- `updateBranding` (`api.ts:162-167`).
- Also remove now-unused imports from the `import type` block (`api.ts:17-18` for `StoreBranding`, `StoreDomain`).

### Sidebar edit

- `apps/admin/src/components/layout/Sidebar.tsx:27` — remove the `{ href: '/dashboard/create-store', label: 'Crear Tienda', Icon: Sparkles }` nav item. (`Sparkles` import at line 15 becomes unused; `Palette` still used by Mi Tienda.)
- `apps/admin/src/components/layout/__tests__/Sidebar.test.tsx:15-19` — test only asserts Mi Tienda link, leave as-is (no create-store assertion), but verify no other test references create-store.

### my-store page rewrite (branding editor removed)

- `apps/admin/src/app/dashboard/my-store/page.tsx` — full rewrite; remove all `useBranding`, `MiTiendaPreview`, `ALLOWED_FONTS` import (line 8), `lib/color` import (line 12), color/font/radius state and handlers, the `getStoreDomain` hostname effect (lines 59-65), the `Ver mi tienda` external link (121-131).
- `apps/admin/src/app/dashboard/my-store/__tests__/page.test.tsx` — full rewrite to assert the new developer-hub content instead of branding.

### Cross-file dependency to break

- `BrandingStep.tsx` exports `ALLOWED_FONTS` (lines 13-25) which `my-store/page.tsx` imports (line 8). Deleting BrandingStep requires either inlining the font list into the new page or removing it (new page no longer needs fonts).

## Mi Tienda target behavior (data/endpoints the new page needs)

The new `/dashboard/my-store` should show, for the seller's own store:

1. **Store slug** — needed to build `/api/v1/:slug/...` URLs. Gap: not currently available to the seller (see Gaps).
2. **API base URL** — the core API base. Reuse `NEXT_PUBLIC_API_URL` (`api.ts:37`), same value the admin already calls; the developer API v1 lives on the same core backend. Display `/api/v1/:slug` endpoint reference.
3. **API key management** — list/create/revoke via existing core endpoints:
   - `GET /stores/:storeId/api-keys` (masked list: id, name, prefix, active, last_used_at, expires_at, created_at, revoked_at).
   - `POST /stores/:storeId/api-keys` body `{name}` → `{api_key, plaintext}` (plaintext shown exactly once; prefix = first 12 chars `gsk_`+8 hex).
   - `DELETE /stores/:storeId/api-keys/:keyId` → 204.
4. **Example request snippet** — a `curl`/code block demonstrating `Authorization: Bearer <key>` against `GET /api/v1/:slug/config`.

New `api.ts` methods needed: `listAPIKeys`, `createAPIKey`, `revokeAPIKey` + a new `APIKey`/`StoreAPIKey` type (`id, store_id, name, prefix, active, last_used_at?, expires_at?, created_at, revoked_at?`).

## Gaps (slug availability + proposed minimal core addition)

**Confirmed gap.** `apps/core/internal/middleware/store_context.go` only injects the store **UUID** into Fiber locals (`keyStoreID = "store_id"`, line 11; set at lines 27, 57; read via `GetStoreID` lines 63-66). It does NOT load the full `models.Store` row, so **slug is not reachable** without a new DB query.

The full `models.Store` struct (`apps/core/internal/models/store.go:11-21`) has `Slug` (`json:"slug" db:"slug"`). `AdminService.GetStore` (`admin_service.go:266-282`) already selects and returns slug — but its handler `AdminGetStore` (`admin.go:106-121`) is mounted under the superadmin-only `/admin` group (`router.go:129-136`).

No handler under JWT + `StoreContext` returns the store row today. Closest is `GetStoreDomain` (`handlers/domain.go:27-48`) which returns `{hostname, kind, status, is_primary}`, where `hostname = "<slug>.<StorefrontBaseDomain>"` (`auth_service.go:108`). Deriving slug from hostname is possible but fragile (depends on base-domain suffix + multi-domain ordering).

**Proposed minimal core addition** (to feed cleanly into Mi Tienda): add a seller-facing `GET /stores/:storeId` (or `/stores/:storeId/info`) under the existing `store` group (`router.go:64`, `middleware.StoreContext`), returning a seller-safe store view `{id, name, slug}` (reusing `models.Store` or a trimmed DTO). This mirrors `AdminService.GetStore` but is JWT + StoreContext gated (not superadmin). Backed by `SELECT slug FROM stores WHERE id=$1` — already a one-line pattern (see `testutil.GetStoreSlug`, `fixtures.go:242-251`).

Slug generation at registration: `auth_service.go:82-88` (slug via `generateSlug` at `303-319`, `name`-derived + 8-char uuid suffix), hostname provisioning at `108-119`, `stores` JWT claim built at `125-129` (only store_id/role — **no slug** in the token today).

## Core test patterns

### testutil helpers (`apps/core/internal/testutil/`)

- `setup.go`: `SetupTestApp(t)` (line 38), `(*TestApp).CleanDB` (72), `Cleanup` (95), `OwnerAuthHeader(t)` → returns `(Bearer header, accountID, storeID)` (101), `SuperAdminAuthHeader` (138), `CreateOtherOwner` (157), HTTP helpers `GET/GETWithHeaders/POST/PUT/PATCH/DELETE/POSTFile` (164-265), `generateTestJWT` (268).
- `fixtures.go`: `CreateTestProduct` + `WithName/WithPrice/...overrides` (40), `CreateTestCustomer` (111), `CreateTestOrder` (143), `CreateTestAPIKey` (205, returns key + plaintext), `APIKeyAuthHeader` (235), `GetStoreSlug` (242).
- `assertions.go`: `AssertStatus`, `AssertJSON`, `AssertError`, `AssertPaginated`, `AssertNoError`.

### Existing api-key handler tests (`apps/core/internal/handlers/api_keys_test.go`)

Uses `testutil.SetupTestApp`, `app.OwnerAuthHeader`, `app.GET/POST/DELETE`, `testutil.AssertStatus`, plus local helpers `rawAndJSON`/`jsonArray` (lines 22-40). Covers create (plaintext-exactly-once, 400 on bad name, 401 unauth, 403 cross-owner), list (masked, no key_hash/plaintext), revoke (204, 404 on re-revoke/unknown/foreign key, 403 cross-owner). These are the template for any new store-info endpoint test.

## Doc/resource references

- **Archived change mirror** `apps/core/openspec/changes/archive/2026-09-17-storefront-public-api-keys/` — `proposal.md` (Intent/Scope/Capabilities/Approach/Affected Areas table/Risks/Rollback/Dependencies/Success Criteria), `specs/api-key-management/spec.md` and `specs/storefront-developer-api/spec.md` (Given/When/Then scenarios, RFC 2119 MUST/SHALL/MAY). Same style to mirror for this change.
- **Main specs** `apps/core/openspec/specs/`:
  - `api-key-management/spec.md` — requirements: Create Store API Key, Key Name Validation, List Keys (Masked), Revoke Key, Store-Scoped Isolation and Errors.
  - `storefront-developer-api/spec.md` — requirements: Versioned Endpoint Group (table of 6 endpoints + reused handlers), Bearer Authentication and Authorization (401/403 matrix), last_used_at Tracking, /public/* Unchanged.
- **Integration guide** `docs/docs/api/integracion-tienda-externa.md` (dated, documents `/public/*` with X-Origin-Shared-Secret; the `/api/v1/*` Bearer-key surface is the newer developer path from the archived change). Key facts to mirror in the new admin UI:
  - Auth header: `Authorization: Bearer <key>` (v1 group; `middleware/api_key.go:22-63`). Note the guide documents `X-Origin-Shared-Secret` for the legacy `/public/*` group — not the v1 group.
  - Base URL patterns: local `http://localhost:3000`, staging `https://api.staging.vettacode.com`, prod `https://api.vettacode.com` (guide lines 33-46, with a warning that code fallbacks use `goshopping.com`/`goshopping.co` — confirm real domain).
  - Response envelope: errors always `{"error": "<string>"}`; pagination `{data,total,page,per_page,total_pages}`; money as fixed-2 decimal number; IDs as UUID strings (guide section 7, lines 783-797).
  - v1 endpoints + reused handlers (from `router.go:52-58`): config, products, products/:productId, quote, orders, orders/:orderId/status.
- **Existing change state**: `apps/core/openspec/changes/admin-developer-hub/state.yaml` already exists (explore=in_progress).

## Risks

1. **No seller-accessible slug endpoint.** The single biggest blocker for the new Mi Tienda developer hub. Mitigation: add store-scoped `GET /stores/:storeId` (JWT + StoreContext) returning `{id,name,slug}` — small, additive, mirroring `AdminService.GetStore`.
2. **API-key endpoints are uncommitted working-tree code.** The new admin page would depend on `GET/POST/DELETE /stores/:storeId/api-keys` which exist in the working tree but are not yet committed (part of archived change 2026-09-17). Verify they are committed/merged before the admin page ships, or scope accordingly.
3. **The `/api/v1/*` group requires local Postgres + key infra.** Admin e2e is not exercised in CI here (jest only); the seller-facing examples reference a real base URL (`NEXT_PUBLIC_API_URL`) whose production value is unconfirmed (guide warns `vettacode.com` vs `goshopping.com` fallbacks).
4. **Docs drift.** `docs/docs/servicios/storefront-design-system.md` (lines ~176) and `docs/docs/storefront/templates.md` describe the admin "wizard de creacion de tiendas" using `@goshopping/template-catalog`. These documentation pages will silently disagree with reality after create-store is removed (build artifacts under `docs/build/` too). Out of scope for code, but a follow-up doc cleanup is warranted.
5. **`@goshopping/template-catalog` still used by admin.** After removing create-store + the branding editor, the only remaining admin consumer of `@goshopping/template-catalog` is removed; the `apps/admin/package.json` dependency (line 15) can be dropped (the storefront still uses it, so the lib itself stays).
6. **`Store` type vs `StoreDomain`/`Branding` types.** Keep `Store` (has `slug`); delete the branding/domain types. The my-store rewrite must not accidentally leave `getStoreDomain` or `getBranding` referenced (currently `page.tsx:61-64`).
