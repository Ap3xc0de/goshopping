---
sidebar_position: 5
---

# Endpoint: Health Check

## GET /health

Verifica que el servidor y la base de datos están operativos. No requiere autenticación.

**Request:**
```http
GET /health HTTP/1.1
Host: 127.0.0.1:3000
```

**Response 200:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-05-23T18:30:00.123456789Z"
}
```

**Response 503 (si la BD no responde):**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "connection refused"
}
```

## Usos

1. **Kubernetes liveness probe**: `livenessProbe.httpGet.path: /health`
2. **ECS health check**: `"healthCheck": {"command": ["CMD-SHELL", "curl -f http://localhost:3000/health"]}`
3. **Verificación en desarrollo local**:

```powershell
# IMPORTANTE: usar 127.0.0.1, no localhost
# En esta máquina, localhost resuelve a ::1 (IPv6) y puede apuntar a otro proceso
curl http://127.0.0.1:3000/health
```
