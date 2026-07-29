---
sidebar_position: 4
---

# Tests Operacionales — Etapa 1

Los 12 tests que verifican que la Etapa 1 está completa y operativa.

## Prerrequisitos

- Stack Docker corriendo (`docker compose up -d`)
- Core API corriendo en `:3000`
- `curl` disponible en PowerShell

## Script de tests

```powershell
# Guardar como: scripts/test-etapa1.ps1

$BASE = "http://127.0.0.1:3000"
$PASS = 0
$FAIL = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body = "",
        [string]$Token = "",
        [int]$ExpectedStatus
    )
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    try {
        $response = if ($Body) {
            Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -Body $Body -ErrorAction Stop
        } else {
            Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
        }
        $status = $response.StatusCode
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
    }
    
    if ($status -eq $ExpectedStatus) {
        Write-Host "✅ $Name (expected $ExpectedStatus, got $status)"
        $script:PASS++
    } else {
        Write-Host "❌ $Name (expected $ExpectedStatus, got $status)"
        $script:FAIL++
    }
    
    return $response
}

# Test 1: Health check
Test-Endpoint "Health check" "GET" "$BASE/health" -ExpectedStatus 200

# Test 2: Register
$regBody = '{"email":"test@etapa1.com","password":"password123","name":"Test User"}'
$regResp = Test-Endpoint "Register" "POST" "$BASE/auth/register" -Body $regBody -ExpectedStatus 201
$token = ($regResp.Content | ConvertFrom-Json).access_token

# Test 3: Login
$loginBody = '{"email":"test@etapa1.com","password":"password123"}'
$loginResp = Test-Endpoint "Login" "POST" "$BASE/auth/login" -Body $loginBody -ExpectedStatus 200
$token = ($loginResp.Content | ConvertFrom-Json).access_token

# Obtener store_id del token
$storeId = (($loginResp.Content | ConvertFrom-Json).account | ConvertTo-Json | ConvertFrom-Json)
# O desde el JWT payload... simplificar:
$loginData = $loginResp.Content | ConvertFrom-Json
$storeId = $loginData.account.id  # Ajustar según respuesta real

# Test 4: Refresh token
$refreshBody = "{`"refresh_token`":`"$( ($loginResp.Content | ConvertFrom-Json).refresh_token )`"}"
Test-Endpoint "Refresh token" "POST" "$BASE/auth/refresh" -Body $refreshBody -ExpectedStatus 200

# Test 5-12 requieren store_id del JWT claims.stores[0].store_id
# Ver implementación completa en: scripts/test-etapa1-full.ps1

Write-Host ""
Write-Host "Resultados: $PASS passed, $FAIL failed"
```

## Tests manuales (curl)

### Test 1: Health check
```powershell
curl http://127.0.0.1:3000/health
# Esperado: {"status":"ok","database":"connected",...}
```

### Test 2: Register
```powershell
curl -X POST http://127.0.0.1:3000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@etapa1.com","password":"password123","name":"Test User"}'
# Esperado: 201 con access_token, refresh_token, account
```

### Test 3: Login
```powershell
curl -X POST http://127.0.0.1:3000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@etapa1.com","password":"password123"}'
# Esperado: 200 con tokens
```

### Test 4: Refresh
```powershell
# Usar el refresh_token del test anterior
curl -X POST http://127.0.0.1:3000/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{"refresh_token":"<refresh_token_aqui>"}'
# Esperado: 200 con nuevos tokens
```

### Test 5: Login fallido
```powershell
curl -X POST http://127.0.0.1:3000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@etapa1.com","password":"wrongpassword"}'
# Esperado: 401
```

### Test 6-12: CRUD de recursos
```powershell
# Requiere token y store_id del Test 3
# Ver setup-local.md para instrucciones completas
```

## Criterios de éxito Etapa 1

| # | Test | Criterio |
|---|---|---|
| 1 | Health check | `200 OK`, `status: ok`, `database: connected` |
| 2 | Register nuevo usuario | `201 Created`, tokens presentes |
| 3 | Login con credenciales correctas | `200 OK`, tokens presentes |
| 4 | Refresh token | `200 OK`, nuevos tokens |
| 5 | Login con credenciales incorrectas | `401 Unauthorized` |
| 6 | Crear producto | `201 Created` |
| 7 | Listar productos | `200 OK`, paginación presente |
| 8 | Crear cliente | `201 Created` |
| 9 | Crear pedido | `201 Created` |
| 10 | Cambiar estado de pedido | `200 OK` |
| 11 | Acceso sin token | `401 Unauthorized` |
| 12 | Acceso a store de otro usuario | `403 Forbidden` |
