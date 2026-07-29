# ADR-001: Monorepo Structure

**Status**: Accepted  
**Date**: 2024-01  
**Deciders**: Go Shopping Engineering

---

## Context

Go Shopping is an intelligent e-commerce middleware connecting online stores with payment gateways, accounting systems, marketing platforms, and WhatsApp. The system requires multiple services (backend API, integrations hub, AI engine) and multiple frontends (superadmin, store admin, storefront) developed and deployed by the same team.

The question is: **single repository (monorepo) or multiple repositories (polyrepo)?**

---

## Decision

We adopt a **monorepo** with the following top-level structure:

```
goshopping/
├── apps/
│   ├── core/          # Go + Fiber — REST API, business logic, DB
│   ├── integrations/  # NestJS — external integrations (Wompi, PayU, Siigo, Meta…)
│   ├── ai-engine/     # Go — AI/ML processing
│   ├── superadmin/    # Next.js — platform operator dashboard
│   ├── admin/         # Next.js — store owner dashboard
│   └── storefront/    # Next.js — end-customer shopping frontend
├── libs/
│   ├── shared-types/  # TypeScript interfaces shared across frontends
│   └── storefront-sdk/ # Typed HTTP client for storefront apps
├── infra/             # Terraform — all cloud infrastructure
├── docker/            # Docker Compose for local dev
└── .github/workflows/ # CI/CD — one workflow per deployable unit
```

---

## Rationale

| Factor | Monorepo ✅ | Polyrepo ❌ |
|--------|-----------|-----------|
| Shared types across frontends | One `libs/shared-types` package, always in sync | Would require npm publishing or git submodules |
| Cross-service refactors | Single PR, single review | Multiple PRs, coordination overhead |
| Local development | One `docker-compose up` spins everything | Each repo has its own dev setup |
| CI visibility | All workflows in one place | Scattered across repos |
| Onboarding | Clone once, run `make dev` | Clone N repos, configure N times |
| Independent deployments | GitHub Actions path-based triggers per `apps/*` | Natural isolation, but not needed at this scale |

The team is small (< 10 engineers). Monorepo overhead only becomes a problem at scale (500+ engineers, 1000+ packages). For Latam SaaS at Series A stage, monorepo acceleration wins.

---

## Consequences

- **Positive**: Atomic commits across services, shared type safety, unified CI.
- **Negative**: Need discipline with `apps/` path isolation to avoid accidental coupling. Each `app` must have its own `go.mod` / `package.json` — no shared runtime dependencies.
- **Rule**: `apps/*` can import from `libs/*` but NEVER from other `apps/*`. Services communicate only via HTTP or SQS events.

---

## Alternatives Considered

1. **Full polyrepo** — rejected. Too much coordination overhead for a 3-person engineering team.
2. **Turborepo/Nx monorepo** — considered. Deferred to Etapa 2 when build caching becomes a pain point. Current `make` + GitHub Actions is sufficient.
