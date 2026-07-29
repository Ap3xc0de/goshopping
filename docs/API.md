# Go Shopping — API Reference

Base URL: `http://localhost:3000` (local) | `https://api.goshopping.co` (production)

All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Health

### GET /health

Public. Returns service health and DB connectivity.

**Response 200**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "development"
}
```

**Response 200 (DB unreachable)**
```json
{
  "status": "degraded",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## Auth

### POST /auth/register

Create a new account. Automatically creates a default store and assigns the account as `owner`.

**Request**
```json
{
  "email": "owner@tienda.com",
  "password": "min8chars",
  "name": "María García"
}
```

**Response 201**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "account": {
    "id": "uuid",
    "email": "owner@tienda.com",
    "name": "María García",
    "role": "owner",
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 400  | Missing required fields |
| 409  | Email already registered |

---

### POST /auth/login

Authenticate with email and password.

**Request**
```json
{
  "email": "owner@tienda.com",
  "password": "min8chars"
}
```

**Response 200** — same shape as `/auth/register` response.

**Errors**
| Code | Reason |
|------|--------|
| 400  | Missing fields |
| 401  | Invalid credentials |

---

### POST /auth/refresh

Exchange a valid refresh token for a new token pair.

**Request**
```json
{
  "refresh_token": "<jwt>"
}
```

**Response 200**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>"
}
```

**Errors**
| Code | Reason |
|------|--------|
| 401  | Invalid or expired refresh token |

---

## JWT Claims

Access token payload:
```json
{
  "sub": "account-uuid",
  "role": "owner",
  "stores": [
    { "store_id": "uuid", "role": "owner" }
  ],
  "token_type": "access",
  "iat": 1700000000,
  "exp": 1700000900
}
```

- Access token TTL: **15 minutes**
- Refresh token TTL: **7 days**

---

## Multi-Tenancy

All store-scoped endpoints follow the pattern:

```
/stores/:storeId/<resource>
```

The `StoreContext` middleware:
1. Extracts `:storeId` from the path
2. Verifies the authenticated account has access via `store_users` table
3. Superadmins bypass the check
4. Injects `store_id` into the request context

---

## Error Format

All errors return:
```json
{
  "error": "Human-readable message"
}
```

---

## SQS Event Schema

All events published to SQS queues follow:
```json
{
  "event_id": "uuid",
  "event_type": "order.created",
  "store_id": "uuid",
  "payload": {},
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**Queues**
| Queue | Events |
|-------|--------|
| `goshopping-order-events` | `order.created`, `order.paid`, `order.cancelled` |
| `goshopping-payment-events` | `payment.approved`, `payment.rejected` |
| `goshopping-accounting-events` | `invoice.requested` |
| `goshopping-notification-events` | `whatsapp.send`, `email.send` |
| `goshopping-marketing-events` | `conversion.track` |
