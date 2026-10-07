# Feature: marketplace-api

## Objective
Expose cross-store, unauthenticated read endpoints in `apps/core` so the Goshopping Flutter app can browse ALL stores and products.

## Problem
The current public API is per store (`/public/:storeSlug/...`). There is no store listing, no cross-store product search, store config exposes only id/name/slug/status, and `PublicListProducts` ignores client pagination (fixed page 1, 50 per page).

## Scope (authorized)
- Add `/marketplace/*` read endpoints in `apps/core` (handlers, services, router, tests, migration if needed, docs/API.md).
- Out of scope: Flutter app, user accounts, payments, API key auth, order flow changes.

## Constraints
- Only `active` stores and `active` products are ever exposed; never expose `cost` or other private fields.
- Follow existing Go/Fiber/pgx patterns in `apps/core`.
- Artifacts in English; ~400 changed lines per task is a planning heuristic only.

## Execution config
- TDD: enabled (source: project config, SDD strict TDD). Runner: `go test ./...` in `apps/core`.
- Delivery strategy: ask-on-risk. Forecast: ~500 authored changed lines.
- Branch: `feat/marketplace-api`

## Tasks
- [x] T1 `GET /marketplace/stores` (pagination, search by name) + tests — commit 5cfd0ae; `TestMarketplaceListStores` PASS against real Postgres; live `curl /marketplace/stores` returns expected JSON.
- [x] T2 `GET /marketplace/products` (cross-store search, category, pagination, store info) + tests — commit 8062988 (182 lines); `TestMarketplaceListProducts` 4 subtests PASS against real Postgres (parent re-ran by name); build/vet/gofmt clean.
- [x] T3 Store profile fields (logo_url, description, category) via migration, exposed in marketplace + public config — commit fcfbda4; migration 004 applied; tests PASS; also `?category=` filter on /marketplace/stores.
- [x] T4 Honor `page`/`per_page` in `GET /public/:storeSlug/products` — commit eab865b; `TestPublicListProductsPagination` PASS.
- [x] T5 Document endpoints in `docs/API.md` — commit 67dd2f4.

## Route declaration
- T1: delegated writer (needs reading router, models, services, DB schema + 2+ files).

- [x] T6 Hardening of advisory findings (user: "corrige todo lo que falta") — commit 77ff8f9 (~203 lines): generic 500 + server log, request context with 5s timeout, paging/tie-breaker/empty-page/non-numeric tests. Parent verified: build/vet/gofmt clean; `go test -run TestMarketplace` 7 PASS; `make test-core` only the 5 known baseline failures. Count/list remain non-transactional (accepted, minor).

## Acceptance criteria
- Each endpoint returns `{data,total,page,per_page,total_pages}`, caps `per_page`, and returns only active data.
- `go test ./...` passes in `apps/core`.

## Progress / evidence
- T1 (delegated writer): commit 5cfd0ae, 258 lines added. Parent verified: `go build ./...` OK, `go vet ./...` OK, `go test ./internal/services` OK. `go test ./internal/handlers` fails with connection refused to Postgres :5432 (pre-existing on baseline too). Assessed review tier: not run yet.

- Env: Docker Desktop needs `/Applications/Docker.app/Contents/Resources/bin` on PATH for `make dev`. Postgres is on localhost:5434 (user/pass/db from docker/docker-compose.yml). Run tests with `make test-core` after Core has booted once (Core applies migrations on start; `go run cmd/server/main.go` is running on :3000).
- Known pre-existing failures on baseline c6c621a (verified in a worktree, unrelated to this feature): TestGetDashboard, TestGetTopProducts, TestGetTopCustomers, TestGetOrder, TestCancelOrder.
- Full handlers suite with T1: 25 PASS, same 5 pre-existing FAIL.

- T2 (delegated writer): commit 8062988. Running slice count vs base c6c621a: 440 authored lines (T1 258 + T2 182), over the ~400 delivery budget.
- Review: T1 medium/under_budget; T2 range (440 lines) medium/`slice_budget_reached`. User granted consent; native review (lens review-reliability) APPROVED and acknowledged (lineage review-b0c273627cf4cc42, authority burned). Reviewed boundary is now commit 8062988. Core on :3000 is the pre-T2 binary; restart it to serve /marketplace/products.
- Non-blocking advisory findings (not authorized as scope yet; user decides):
  - WARNING `marketplace.go`: handlers return `err.Error()` as the 500 message on an unauthenticated API, which can leak DB error details. Fix: generic message + server-side log; add failure-path test.
  - SUGGESTION `marketplace_service.go`: queries use `context.Background()` (no cancel/timeout); count and list are not transactional.
  - SUGGESTION `marketplace_test.go`: no page-2 content/ordering assertion, no page beyond total_pages, no non-numeric page/per_page.
- Delivery strategy pending: slice exceeded ~400 lines; ask user for chain strategy (stacked-to-main | feature-branch-chain) before the next commit.

- T3/T4/T5 (delegated writer): commits fcfbda4, eab865b, 67dd2f4. Parent verified: build/vet/gofmt clean; `make test-core` only the 5 known baseline failures; rebuilt Core on :3000 and live `curl` of /marketplace/stores and /marketplace/products returns the new fields and nested store.
- Review of T3-T5 range (base 8062988): medium, 313 lines, `under_budget` => not due; stays pending in the slice.
- Total slice vs base c6c621a: ~750 authored lines across 5 commits.

- Review of range 8062988..77ff8f9: medium, 512 lines, `slice_budget_reached` => due. START returned consent envelope (lineage review-1e60bbf07561ba7e); awaiting user decision. Total slice vs c6c621a ~950 lines.

## Next step
User decisions pending: delivery chain strategy (stacked-to-main recommended | feature-branch-chain); whether to add a hardening task for the advisory review findings (500 error leak first). Then build the Flutter app (separate feature).
