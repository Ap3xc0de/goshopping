# Feature: shopper-auth

## Objective
Authentication for Goshopping shoppers (the Flutter app users) with Amazon Cognito: email + password sign-up/sign-in, Apple, Google and Facebook social login.

## Problem
No Cognito exists in the repo or in `infra/` (no module). Core only has its own seller JWT auth (`accounts`, bcrypt, HS256) in `apps/core/internal/{services/auth_service.go,middleware/auth.go}`. The shopper needs a separate identity; the Flutter app does not exist yet; the local Flutter SDK is unusable.

## Decisions (user-confirmed)
- Providers: email+password, Apple, Google, **Facebook** (Cognito has no native Instagram provider; Instagram Basic Display API was shut down 2024-12-04; user chose Facebook).
- Shoppers use a dedicated Cognito user pool, separate from the seller JWT auth (assumption from recommendation; revisit if the user objects).
- Flutter client: Amplify Auth Cognito + Hosted UI for social providers (recommendation, not yet confirmed).

## Scope (authorized so far)
- Local code and Terraform code for Cognito, Core token validation, and the Flutter auth feature.
- NOT authorized: `terraform apply`/any AWS or remote operation, or creating Google/Apple/Facebook developer apps. Needs explicit user authorization for destination, operation and credentials.

## Constraints
- Artifacts in English. TDD enabled, runner `go test` (Core via `make test-core`) / `flutter test` once the SDK works.
- Delivery strategy: ask-on-risk (pending user choice stacked-to-main | feature-branch-chain). Branch off `feat/marketplace-api`.

## Execution config (A3)
- Flutter 3.47.6 / Dart 3.13.5 works now (user fixed permissions). `flutter doctor`: iOS/Xcode 27, Chrome, macOS OK; **Android SDK missing** (user decision to install Android Studio; Android builds unverifiable until then).
- TDD enabled (source: project config), runner `flutter test` in `apps/mobile`; also `flutter analyze` and `dart format`.
- Assumptions taken by default (user may override): app id `co.goshopping.app`; state management Riverpod; routing go_router; Amplify Flutter (`amplify_auth_cognito`) with Hosted UI for Apple/Google/Facebook; deep links `goshopping://auth/callback` and `goshopping://auth/signout`; UI copy in Spanish (project convention), code in English; the app sends the Cognito ID token to `GET /me`.

## Blockers (resolved: Flutter SDK permissions)
- ~~Flutter SDK at `/opt/homebrew/share/flutter` is root-owned~~ RESOLVED by the user. Previously: root-owned: `bin/cache` not writable, and git reports dubious ownership. User must fix (e.g. `sudo chown -R $(whoami) /opt/homebrew/share/flutter` and `git config --global --add safe.directory /opt/homebrew/share/flutter`) or install Flutter under the home directory.
- Social providers need user-supplied credentials: Google OAuth client id/secret, Apple Services ID + team id + key id + private key, Facebook app id/secret. Terraform will take them as sensitive variables, never committed.

## Tasks
- [x] A1 (commits 9534674 module+staging+ecs env+docs, 104b818 `name` attribute not required; UNVERIFIED by tooling: terraform/tofu not installed; parent read module/main.tf and found it coherent) Terraform module `infra/modules/cognito` (user pool with email sign-in, password policy, email verification; public mobile app client with PKCE and no secret; hosted UI domain; IdPs Google/Apple/Facebook from sensitive variables; outputs) wired into staging; `terraform fmt`/`validate` only, no apply.
- [x] A2 (commits 42d992f middleware+config, 2ee4d18 shoppers migration/service/`GET /me`/docs; ~1046 lines, ~60% tests; parent verified: build/vet/gofmt clean, 19 named auth tests PASS incl. HS256 confusion/alg none/unknown kid/expired/wrong issuer+client, `make test-core` only the 5 baseline failures; migration 005 applied to the dev DB) Core: Cognito JWT validation middleware (JWKS fetch+cache; check iss, token_use, client_id/aud, exp), config (`COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`), `shoppers` table migration, `GET /me` that upserts the shopper by `sub`; tests with a locally generated RSA key and JWKS.
- [x] A3 (commits 9e44951 scaffold, e7d6d70 auth flows; ~6.6k lines incl. ~1.9k generated platform files; parent verified: `flutter analyze` clean, `dart format` clean, `flutter test` 132 PASS, no build outputs/secrets tracked; writer also ran `flutter build ios --debug --no-codesign` OK. NOT verified: Cognito/social flows end to end, Android build, deep-link callbacks, Amplify JSON shape against a real pool) Flutter scaffold `apps/mobile` (Clean Architecture, auth feature): sign up + confirm code, sign in, forgot/reset password, Apple/Google/Facebook via Hosted UI, session restore, sign out; tests. BLOCKED until the Flutter SDK is usable.
- [ ] A4 Docs: `docs/` auth setup guide (Cognito config, provider console steps, env vars, redirect URIs / deep links).

## Route declaration
- A1, A2, A3: delegated writers (multi-file, need prior reading).

## Acceptance criteria
- A2: valid Cognito-style token => 200 on `GET /me`; wrong issuer/client/expired/ID-vs-access mismatch => 401; tests pass with the 5 known baseline failures only.
- A1: `terraform validate` succeeds (if terraform is available) and no secrets are committed.

## Progress / evidence
- Explored: no Cognito references in tracked files; seller auth is HS256 JWT. Web-verified provider support (AWS docs) and Instagram API shutdown.

- Branch `feat/shopper-auth` created off `feat/marketplace-api` (77ff8f9, reviewed boundary).
- Review of 77ff8f9..2ee4d18: medium, 1046 lines, `slice_budget_reached` => due. START returned consent (lineage review-d91013fdfa557581), awaiting user decision. New commits must wait until the review closes (frozen candidate).
- Open decision gaps from A2: populate `avatar_url` from the ID token `picture` claim (recommended yes); `auth_provider` only updates from ID tokens' `identities` claim; `GetBySub` has no own test.
- Note: Core on :3000 is stale; restart it to serve `/me` and the newest marketplace fixes. Cognito env vars unset locally => `/me` fails closed (503) until the pool exists.

- A2 review (77ff8f9..2ee4d18) APPROVED + acknowledged (lineage review-d91013fdfa557581); WARNING (JWKS mutex held during fetch) fixed in b117191 (single-flight, `-race` clean, 24 named auth tests PASS verified by parent). Reviewed boundary: 2ee4d18.
- Follow-up review of 2ee4d18..104b818 (medium, 702 lines): user granted, APPROVED with no findings, acknowledged (lineage review-1152795e63adf9a1, authority burned). Reviewed boundary: 104b818. All shopper-auth commits so far are reviewed.
- Open decisions for the user: (1) mobile deep-link scheme (defaults `goshopping://auth/callback` and `goshopping://auth/signout`; signout path is a guess); (2) staging hosted UI domain prefix (default `goshopping-staging`, must be globally unique); (3) Facebook `picture` mapping unverified; (4) `avatar_url` from `picture` (recommended yes); (5) install terraform locally to run fmt/validate (recommend `brew install terraform`).

- A3 review (104b818..e7d6d70): HIGH risk (auth hot path `auth_redirect.dart`), 128 paths, 6601 lines => review due (`high_risk`). User granted consent, but START refused with `lens_context_budget_exceeded` (candidate evidence exceeds the native review context budget; no review authority created; documented contract limit, not a defect). Continuation: review smaller candidates. Awaiting user decision (split local unpushed commits into smaller work units vs proceed without native review for this slice).
- A3 decision gaps for the user: app id `co.goshopping.goshopping` (generated) vs `co.goshopping.app` (assumed; costly to change after store registration); Apple button hidden on Android (rule in `socialProvidersFor`, `social_providers_for_platform.dart`); generic Material icons instead of official brand buttons; `goshopping://auth/signout` is a guessed path; Android SDK not installed.
- A4 docs: partially done (docs/API.md `/me`, docs/docs/infraestructura/cognito-shoppers.md, apps/mobile/README.md).

- A3 split (user chose "split into small commits"): local unpushed commits 9e44951/e7d6d70 rewritten into 9 layered commits (backup branch `backup/shopper-auth-a3-before-split` -> e7d6d70; final tree verified IDENTICAL to e7d6d70 via `git diff e7d6d70 HEAD`, so analyze/format/132 tests results still apply). Units: a1cbd56 scaffold(1104) a779834 ios(1205) 47322f9 android(263) d4776d1 core(537) f954274 domain(313) 8cb167f data(877) 91ab27a state+redirect(836) f341b53 screens(641) 6ff6f6c wiring+screen tests(825). Import order validated by script (no unit imports a later one), intermediate commits not individually built.
- Review plan (worktrees under ~/goshopping-worktrees, one consent per candidate): C2 = d4776d1..f954274 (core+domain), C3 = f954274..91ab27a (data+state/redirect), C4 = 91ab27a..6ff6f6c (screens+wiring), C1 = 104b818..47322f9 (scaffold+platforms; mostly generated). Adapt if a candidate hits `lens_context_budget_exceeded`.

- Split reviews so far (all APPROVED + acknowledged, authority burned, 4 lenses each, worktrees ~/goshopping-worktrees/a3-c2..c4): C2 core+domain (review-bd8fc1e44da64afe), C3 data+state/redirect (review-73b78beca55caf49), C4 screens+wiring (review-2abc1c9cf840d791). C1 (scaffold+platforms, medium, 2572 lines, 1 lens) APPROVED + acknowledged. ALL A3 commits are now reviewed. Review worktrees removed. C1 warnings: (a) android/settings.gradle.kts pins AGP 9.1.0 + Kotlin 2.4.0 while gradle.properties sets `android.newDsl=false`/`android.builtInKotlin=false` and app/build.gradle.kts applies no kotlin plugin => Android build likely broken or fragile; UNVERIFIED (no Android SDK); (b) README documented lib/ not present in that commit (artifact of the split, resolved at HEAD).
- Non-blocking findings to fix in one follow-up commit (own review afterwards): `ApiClient` (Uri.parse outside try so a bad API_BASE_URL escapes as raw FormatException; Handshake/TLS exceptions not mapped to ApiFailure; no test for invalid UTF-8; cleartext http default with Bearer token and no https enforcement for non-local hosts; 10.0.2.2 comment mismatch); `signOut` swallows remote failure and clears local state only; `authRedirect` has no error input when session restore fails; `shopperProvider` bare http.Client with no timeout and retry disabled; `run` guard in action_controllers not "latest call wins"; `sign_in_screen` "confirm account" does nothing with empty email; Home sign-out fire-and-forget; magic number 6 for code length duplicated; password policy duplicated in validators/AppStrings/Cognito; router `_requireEmail` and `main.dart` Amplify-failure fallback untested.

## Next step (superseded: see STATUS SNAPSHOT at the end)
Finish C1 review, then the fixes commit; user decisions above; install terraform to validate infra; provider credentials + AWS apply authorization to test end to end.

---

## STATUS SNAPSHOT (end of session 2026-10-07) — resume here

### Done and pushed to GitHub (origin = Ap3xc0de/goshopping; no PRs opened)
- `feat/marketplace-api` (off main c6c621a): T1–T6, reviewed up to 77ff8f9.
- `feat/shopper-auth` (off feat/marketplace-api): A2 Core Cognito validation + `GET /me` + `shoppers` migration 005, A1 Terraform cognito module (staging only, never applied), A3 Flutter app `apps/mobile` in 9 layered commits + 3 fix commits (06af488 api client, 6624048 sign-out/session restore, 295b709 code field + password policy). Everything is natively reviewed and approved (last reviewed commit: 295b709; fixes review lineage review-77ea39b82a6147de).
- Verified by the parent at HEAD: Core `make test-core` only the 5 known baseline failures; `flutter analyze` clean, `dart format` clean, `flutter test` 184 PASS; iOS debug build OK (writer). Android build NOT verified (no Android SDK; Gradle config is identical to the stock Flutter 3.47.6 template except minSdk 24 + deep link).

### NOT verified
- Any end-to-end Cognito / Apple / Google / Facebook flow (no pool exists), deep-link callbacks, Amplify JSON shape vs a real pool, Terraform (terraform/tofu not installed), Android build.

### Open follow-ups from the last reviews (non-blocking, not yet fixed)
- `home_screen.dart`: sign-out has no timeout; a hung Amplify signOut leaves the button disabled and the user signed in locally (WARNING).
- A failed (not partial) Amplify sign-out may let a later session restore sign the user back in; verify against a real pool.
- `shell_screens_test` asserts /confirm and /reset redirects whose router logic was added in an earlier commit (fine at HEAD).
- Cleartext allow-list lives in api_client.dart separately from app_config.dart; confirmation-code regex built via escaped interpolation (readability).
- Marketplace: `public.go:68` still returns `err.Error()` on 500 for `GET /public/:slug/products`; count+list queries are non-transactional; JWKS-related items are fixed.
- Pre-existing baseline failures unrelated to this work: TestGetDashboard, TestGetTopProducts, TestGetTopCustomers, TestGetOrder, TestCancelOrder.

### Decisions still needed from the user
1. App id: generated `co.goshopping.goshopping` vs assumed `co.goshopping.app` (costly to change after store registration).
2. Apple button hidden on Android (`socialProvidersFor`), deep-link signout path `goshopping://auth/signout` (guess), Terraform staging domain prefix `goshopping-staging`, `avatar_url` from the ID token `picture` claim (recommended yes).
3. Delivery strategy for PRs: `stacked-to-main` recommended (PR1 marketplace-api -> PR2/3 shopper-auth slices); nothing opened yet.
4. Authorize `brew install terraform` (to run fmt/validate), provide Google/Apple/Facebook credentials, authorize `terraform apply` (explicit destination/operation/credentials), install the Android SDK/Android Studio.

### Environment notes
- Docker needs `/Applications/Docker.app/Contents/Resources/bin` on PATH for `make dev`; Postgres on localhost:5434; tests with `make test-core` after Core has migrated once (migrations 001–005 applied to the dev DB). Core API on :3000 may be stale; restart with `cd apps/core && DB_HOST=127.0.0.1 DB_PORT=5434 DB_USER=goshopping DB_PASSWORD=localdev123 DB_NAME=goshopping DB_SSL_MODE=disable JWT_SECRET=test-secret-for-goshopping-tests APP_ENV=development go run cmd/server/main.go`.
- Flutter 3.47.6 works; run the app with `--dart-define` values (see apps/mobile/README.md).
- Native review: tools need `--untracked-scope=exclude --expected-untracked-inventory=<sha from status>`; a candidate above the reviewer budget (~>2.6k lines) fails with `lens_context_budget_exceeded` — split commits. START output can be JSON followed by an error line; save raw output and never re-run a granted START blindly.
- Local backup branch `backup/shopper-auth-a3-before-split` (not pushed) holds the pre-split A3 history.
