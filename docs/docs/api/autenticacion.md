---
sidebar_position: 2
---

# Autenticación

Go Shopping usa **JWT (JSON Web Tokens)** con HMAC-SHA256. Hay dos tipos de token:

| Token | Duración | Uso |
|---|---|---|
| `access_token` | 15 minutos | Autorizar requests a la API |
| `refresh_token` | 7 días (168h) | Obtener un nuevo access_token |

## Flujo de autenticación

```mermaid
sequenceDiagram
    participant C as Cliente (Admin Panel)
    participant A as Core API
    participant DB as PostgreSQL

    C->>A: POST /auth/login {email, password}
    A->>DB: SELECT account WHERE email=?
    DB-->>A: Account con password_hash
    A->>A: bcrypt.Compare(password, hash)
    A-->>C: 200 OK {access_token, refresh_token, account}

    Note over C,A: 15 minutos después...

    C->>A: GET /stores/xyz/products (access_token expirado)
    A-->>C: 401 Unauthorized

    C->>A: POST /auth/refresh {refresh_token}
    A->>A: Verifica refresh_token JWT
    A-->>C: 200 OK {access_token, refresh_token, account}

    C->>A: GET /stores/xyz/products (nuevo access_token)
    A-->>C: 200 OK [products...]
```

## Endpoints de autenticación

### POST /auth/register

Registra un nuevo account y crea la primera tienda automáticamente.

**Request:**
```json
{
  "email": "dueno@mitienda.com",
  "password": "min8caracteres",
  "name": "Nombre Apellido"
}
```

**Validaciones:**
- `email`: formato válido, único en el sistema
- `password`: mínimo 8 caracteres
- `name`: mínimo 2 caracteres

**Response 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "account": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "dueno@mitienda.com",
    "name": "Nombre Apellido",
    "role": "owner",
    "status": "active",
    "created_at": "2026-05-23T18:30:00Z",
    "updated_at": "2026-05-23T18:30:00Z"
  }
}
```

### POST /auth/login

**Request:**
```json
{
  "email": "dueno@mitienda.com",
  "password": "min8caracteres"
}
```

**Response 200:** igual a `/auth/register`

**Errores:**
- `401`: credenciales incorrectas (mensaje genérico — no revelar si es email o password)
- `403`: cuenta suspendida

### POST /auth/refresh

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:** igual a `/auth/login`

## Estructura del JWT

El payload del access_token:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "role": "owner",
  "stores": [
    {"store_id": "abc123", "role": "owner"},
    {"store_id": "def456", "role": "operator"}
  ],
  "token_type": "access",
  "exp": 1748029800,
  "iat": 1748028900
}
```

| Claim | Descripción |
|---|---|
| `sub` | `account_id` del usuario |
| `role` | Rol del account: `owner`, `superadmin` |
| `stores` | Lista de tiendas con acceso y rol específico |
| `token_type` | `"access"` o `"refresh"` |
| `exp` | Timestamp Unix de expiración |

## Cómo usar el token

```http
GET /stores/abc123/products HTTP/1.1
Host: api.goshopping.co
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

El middleware de autenticación extrae el `account_id` y `role` del token y los inyecta en el contexto de la request.
