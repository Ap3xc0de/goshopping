# Go Shopping

Go Shopping es un middleware inteligente para e-commerce en Colombia/Latam. Conecta la tienda online de un negocio con pasarelas de pago (Wompi, PayU), contabilidad (Siigo, Alegra), marketing (Meta, Google Ads), y WhatsApp — todo automatizado. Cada venta genera automáticamente: descuento de inventario, factura electrónica DIAN, notificación al cliente, y reporte de conversión.

## Arquitectura

```
goshopping/
├── apps/
│   ├── core/           # API principal — Go + Fiber          :3000
│   ├── integrations/   # Servicio de integraciones — NestJS   :3001
│   ├── ai-engine/      # Motor de IA — Go                     :3002
│   ├── superadmin/     # Panel interno — Next.js               :3003
│   ├── admin/          # Panel del vendedor — Next.js          :3004
│   └── storefront/     # Motor de tiendas — Next.js            :3005
├── libs/
│   ├── shared-types/   # Tipos TypeScript compartidos
│   └── storefront-sdk/ # SDK frontend → Core
├── infra/              # Terraform (AWS)
├── docker/             # Docker Compose local
└── .github/workflows/  # CI/CD con GitHub Actions + OIDC
```

## Requisitos

- Go 1.22+
- Node.js 20+
- Docker + Docker Compose
- Terraform 1.5+
- AWS CLI v2

## Setup Local

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar infraestructura local (PostgreSQL, Redis, ElasticMQ)
make dev

# 3. Correr el servidor Core (migrations corren automáticamente al arrancar)
make dev-core

# 4. Verificar health
curl http://localhost:3000/health

# 5. (Opcional) Levantar frontends
make dev-superadmin   # http://localhost:3003
make dev-admin        # http://localhost:3004
```

## Comandos del Makefile

| Comando             | Descripción                              |
|---------------------|------------------------------------------|
| `make dev`          | Levanta PostgreSQL, Redis, ElasticMQ     |
| `make dev-core`     | Inicia Core API (Go)                     |
| `make dev-integrations` | Inicia Integrations (NestJS)         |
| `make dev-superadmin` | Inicia SuperAdmin (Next.js)            |
| `make dev-admin`    | Inicia Admin (Next.js)                   |
| `make migrate`      | Corre migraciones (automático al arrancar Core) |
| `make build-core`   | Build del Core para Linux                |
| `make clean`        | Para y elimina containers + volúmenes    |

## Endpoints Principales

- `GET /health` — Estado del servicio
- `POST /auth/register` — Registro de cuenta
- `POST /auth/login` — Login
- `POST /auth/refresh` — Renovar tokens
- `GET /stores/:storeId/*` — Rutas multi-tenant (requiere JWT)

## Infraestructura AWS (Terraform)

La infraestructura se despliega en AWS usando Terraform. Los módulos están en `infra/modules/`.

```bash
cd infra/environments/staging
terraform init
terraform plan
terraform apply
```

**OIDC**: Los workflows de GitHub Actions usan OIDC — cero access keys almacenadas. El único secret requerido es `AWS_OIDC_ROLE_ARN`.

## Multi-Tenancy

Todas las tablas tienen `store_id`. El middleware `store_context` verifica que el usuario autenticado tenga acceso a la tienda solicitada en cada request a `/stores/:storeId/*`.
