---
sidebar_position: 3
---

# Variables de Entorno

Todas las variables que el Core API necesita para funcionar.

## Archivo .env

Copia `.env.example` a `.env` y ajusta los valores para tu entorno.

```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5434        # Puerto no estándar — ver nota en setup-local.md
DB_USER=goshopping
DB_PASSWORD=localdev123
DB_NAME=goshopping
DB_SSL_MODE=disable

# Auth
JWT_SECRET=local-dev-secret-change-in-production

# AWS / SQS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local-dev
AWS_SECRET_ACCESS_KEY=local-dev
SQS_ENDPOINT=http://localhost:9324    # ElasticMQ local

# App
APP_ENV=development
PORT=3000
```

## Descripción de variables

| Variable | Descripción | Valor local | Valor producción |
|---|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `localhost` | RDS endpoint |
| `DB_PORT` | Puerto de PostgreSQL | `5434` | `5432` |
| `DB_USER` | Usuario de BD | `goshopping` | Desde Secrets Manager |
| `DB_PASSWORD` | Contraseña de BD | `localdev123` | Desde Secrets Manager |
| `DB_NAME` | Nombre de BD | `goshopping` | `goshopping` |
| `DB_SSL_MODE` | SSL para PostgreSQL | `disable` | `require` |
| `JWT_SECRET` | Secreto para firmar JWT | Cualquier string | Mínimo 32 chars aleatorios |
| `AWS_REGION` | Región AWS | `us-east-1` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS key ID | `local-dev` | Desde OIDC (GitHub Actions) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret | `local-dev` | Desde OIDC |
| `SQS_ENDPOINT` | URL del broker SQS | `http://localhost:9324` | Vacío (usa AWS real) |
| `APP_ENV` | Entorno de la app | `development` | `production` |
| `PORT` | Puerto del servidor HTTP | `3000` | `3000` |

## Reglas de seguridad

:::danger Nunca commitear .env
El archivo `.env` está en `.gitignore`. NUNCA lo commits al repositorio.
:::

- `JWT_SECRET` en producción: mínimo 32 caracteres aleatorios. Generar con:
  ```powershell
  [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  ```
- Las credenciales de BD en producción viven en **AWS Secrets Manager**, no en variables de entorno planas.
- `SQS_ENDPOINT` vacío en producción → el SDK de AWS usa el endpoint real de SQS.

## Variables en producción

En ECS Fargate (producción), las variables se inyectan desde:
1. **AWS Secrets Manager** → `DB_PASSWORD`, `JWT_SECRET`, credenciales externas
2. **SSM Parameter Store** → `DB_HOST`, `DB_PORT`, `DB_NAME`, `APP_ENV`
3. **Task Definition** → `AWS_REGION`, `PORT`
