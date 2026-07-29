---
sidebar_position: 1
---

# Setup Local

Esta guía te lleva desde cero hasta tener el stack completo corriendo en tu máquina.

## Prerrequisitos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Go | 1.22 | `go version` |
| Docker Desktop | 4.x | `docker version` |
| Node.js | 20.x | `node --version` |
| Git | 2.x | `git --version` |
| PowerShell | 5.1+ | (incluido en Windows) |

## 1. Clonar el repositorio

```bash
git clone https://github.com/goshopping/goshopping.git
cd goshopping
```

## 2. Configurar variables de entorno

```powershell
# Copiar template
Copy-Item .env.example .env
```

El `.env` generado ya incluye los valores correctos para desarrollo local. **No cambiar `DB_PORT=5434`** — ver nota importante abajo.

:::warning Puerto 5434 para PostgreSQL
El Docker Compose usa el puerto `5434` (no el estándar `5432`) porque esta máquina tiene **PostgreSQL nativo en Windows que ocupa los puertos 5432 y 5433**.

Si tu máquina NO tiene PostgreSQL nativo en Windows, puedes cambiar a `5432` en:
- `docker/docker-compose.yml`: `"5434:5432"` → `"5432:5432"`  
- `.env`: `DB_PORT=5434` → `DB_PORT=5432`

Si tienes dudas, ejecuta:
```powershell
netstat -ano | findstr ":5432"
netstat -ano | findstr ":5433"
```
Si devuelve resultados, esos puertos están ocupados → usa `5434`.
:::

## 3. Levantar el stack Docker

```powershell
docker compose -f docker/docker-compose.yml up -d
```

Servicios que se inician:
- **PostgreSQL 16** en `localhost:5434`
- **Redis 7** en `localhost:6379`
- **ElasticMQ** (SQS local) en `localhost:9324`
- **LocalStack** (S3 local) en `localhost:4566`

Verificar que todos están healthy:
```powershell
docker compose -f docker/docker-compose.yml ps
```

Todos deben mostrar `healthy` en la columna STATUS. Si alguno está en `starting`, esperar 30 segundos y volver a verificar.

## 4. Ejecutar el Core API

```powershell
# Desde la raíz del proyecto
$env:DB_HOST="localhost"
$env:DB_PORT="5434"
$env:DB_USER="goshopping"
$env:DB_PASSWORD="localdev123"
$env:DB_NAME="goshopping"
$env:DB_SSL_MODE="disable"
$env:JWT_SECRET="local-dev-secret-change-in-production"
$env:AWS_REGION="us-east-1"
$env:AWS_ACCESS_KEY_ID="local-dev"
$env:AWS_SECRET_ACCESS_KEY="local-dev"
$env:SQS_ENDPOINT="http://localhost:9324"
$env:APP_ENV="development"
$env:PORT="3000"
go -C apps/core run ./cmd/server/main.go
```

Al iniciar, verás:
```
[INFO] Migrations applied successfully
[INFO] Server starting on :3000
```

## 5. Verificar que funciona

```powershell
# IMPORTANTE: usar 127.0.0.1, no localhost
# En Windows, localhost puede resolver a ::1 (IPv6) y apuntar a otro proceso
curl http://127.0.0.1:3000/health
```

Respuesta esperada:
```json
{"status":"ok","database":"connected","timestamp":"..."}
```

## Troubleshooting frecuente

### "connection refused" en el health check

```powershell
# Verificar que el Core API está corriendo en IPv4
netstat -ano | findstr ":3000"
```

Si ves dos entradas (una IPv4 `0.0.0.0:3000` y una IPv6 `[::]:3000`), hay un conflicto.
Usar `127.0.0.1:3000` en lugar de `localhost:3000`.

### PostgreSQL no conecta

```powershell
# Verificar que el container está healthy
docker compose -f docker/docker-compose.yml ps postgres

# Ver logs del container
docker compose -f docker/docker-compose.yml logs postgres
```

Error `FATAL: no pg_hba.conf entry` → el archivo `docker/pg_hba.conf` tiene encoding incorrecto (CRLF en lugar de LF). En PowerShell:
```powershell
$content = Get-Content docker/pg_hba.conf -Raw
[System.IO.File]::WriteAllText("docker/pg_hba.conf", $content.Replace("`r`n", "`n"))
docker compose -f docker/docker-compose.yml restart postgres
```

### "migrate: no migration" al iniciar

El directorio `apps/core/migrations/` está vacío o no existe. Verificar que el repo se clonó completo.

### ElasticMQ no responde

```powershell
# Verificar colas creadas
curl "http://localhost:9324/?Action=ListQueues"
```

Debe listar 10 colas (5 + 5 DLQs). Si no hay colas, el `elasticmq.conf` no se montó correctamente.
