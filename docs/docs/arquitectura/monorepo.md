---
sidebar_position: 3
---

# Monorepo

Go Shopping usa una estrategia de **monorepo**: todos los servicios, frontends, infraestructura y documentación viven en un único repositorio Git.

## Estructura completa

```
goshopping/
├── .env                       # Variables locales (no commitear)
├── .env.example               # Template de variables de entorno
├── .gitignore
├── Makefile                   # Comandos de desarrollo
├── README.md
│
├── apps/
│   ├── core/                  # Go + Fiber — API principal
│   │   ├── cmd/server/main.go # Entrypoint
│   │   ├── internal/
│   │   │   ├── config/        # Configuración
│   │   │   ├── database/      # Pool pgxpool + migraciones
│   │   │   ├── handlers/      # HTTP handlers
│   │   │   ├── middleware/    # auth, store_context, CORS
│   │   │   ├── models/        # Structs de dominio
│   │   │   ├── router/        # Registro de rutas
│   │   │   └── services/      # AuthService, EventService
│   │   ├── migrations/        # SQL migrations (up/down)
│   │   ├── go.mod
│   │   └── Dockerfile
│   │
│   ├── integrations/          # NestJS — adaptadores externos
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── ai-engine/             # Go — motor de IA (placeholder)
│   │   ├── cmd/server/main.go
│   │   ├── go.mod
│   │   └── Dockerfile
│   │
│   ├── superadmin/            # Next.js — panel Go Shopping
│   │   ├── src/app/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── admin/                 # Next.js — panel del vendedor
│   │   ├── src/app/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── storefront/            # Next.js — tienda pública
│       ├── src/app/
│       ├── package.json
│       └── Dockerfile
│
├── libs/
│   ├── shared-types/          # Tipos TypeScript compartidos
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── store.ts
│   │   │   ├── product.ts
│   │   │   ├── order.ts
│   │   │   ├── customer.ts
│   │   │   └── index.ts       # Re-exports
│   │   └── package.json
│   │
│   └── storefront-sdk/        # SDK HTTP para Storefront → Core
│       ├── src/
│       │   ├── client.ts      # GoShoppingClient
│       │   └── index.ts
│       └── package.json
│
├── infra/
│   ├── modules/               # Módulos Terraform reutilizables
│   │   ├── cdn/               # CloudFront + S3
│   │   ├── ecr/               # Elastic Container Registry
│   │   ├── ecs/               # Elastic Container Service
│   │   ├── oidc/              # GitHub Actions OIDC
│   │   ├── rds/               # PostgreSQL en RDS
│   │   ├── s3/                # Buckets S3
│   │   ├── secrets/           # Secrets Manager
│   │   ├── sqs/               # Colas SQS + DLQs
│   │   ├── ssm/               # SSM Parameter Store
│   │   └── vpc/               # VPC, subnets, security groups
│   └── environments/
│       ├── staging/           # Variables staging, backend S3
│       └── production/        # Variables producción, multi-AZ
│
├── docker/
│   ├── docker-compose.yml     # Stack local: postgres, redis, elasticmq, localstack
│   ├── elasticmq.conf         # Config de colas locales (5 queues + 5 DLQs)
│   └── pg_hba.conf            # Auth config PostgreSQL para desarrollo
│
├── .github/workflows/
│   ├── infra.yml              # Terraform plan/apply
│   ├── core.yml               # Build + push + deploy Core API
│   ├── integrations.yml       # Build + push + deploy Integrations
│   ├── ai-engine.yml          # Build + push + deploy AI Engine
│   ├── superadmin.yml         # Build + push + deploy SuperAdmin
│   └── admin.yml              # Build + push + deploy Admin
│
└── docs/                      # Esta documentación (Docusaurus)
```

## Reglas del monorepo

### 1. Aislamiento de apps
Cada app en `apps/*` tiene su propio:
- `go.mod` o `package.json` (sin dependencias de runtime compartidas)
- `Dockerfile` (imagen independiente)
- Workflow de CI/CD separado

### 2. Solo libs compartidas en `libs/`
Los frontends pueden importar de `libs/shared-types` y `libs/storefront-sdk`. **Nunca** de otro `app/*`.

### 3. Comunicación solo via protocolos
Los servicios se comunican via HTTP o SQS. Nunca importando código de otro servicio.

### 4. Convenciones de naming
- Go packages: `snake_case`
- TypeScript: `camelCase` para variables, `PascalCase` para types/components
- SQL: `snake_case` para tablas y columnas
- Archivos Go: `snake_case.go`
- Archivos TS/TSX: `kebab-case.ts`
