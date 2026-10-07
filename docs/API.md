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

## Marketplace

Public, unauthenticated, cross-store read endpoints. Only `active` stores and `active` products of `active` stores are returned. Private fields (for example `cost`, `min_stock`, `account_id`) are never exposed.

All list endpoints return the same pagination envelope: `data`, `total`, `page`, `per_page`, `total_pages`. Invalid or `< 1` values for `page` / `per_page` fall back to defaults (`page=1`, `per_page=20`); `per_page` is capped at 50.

### GET /marketplace/stores

Lists active stores ordered by name.

**Query parameters**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `per_page` | 20 | Items per page (max 50) |
| `search` | — | Case-insensitive substring match on store name |
| `category` | — | Exact match on store category |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alpha Shop",
      "slug": "alpha-shop",
      "logo_url": "https://cdn.example.com/alpha.png",
      "description": "Fresh goods",
      "category": "grocery"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "total_pages": 1
}
```

`logo_url`, `description` and `category` are empty strings when not set.

### GET /marketplace/products

Lists active products across all active stores, ordered by name.

**Query parameters**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `per_page` | 20 | Items per page (max 50) |
| `search` | — | Case-insensitive substring match on product name |
| `category` | — | Exact match on product category |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "name": "Banana",
      "sku": "BAN-001",
      "description": "",
      "price": 1500.00,
      "stock": 10,
      "category": "fruit",
      "images": [],
      "status": "active",
      "store": {
        "id": "uuid",
        "name": "Alpha Shop",
        "slug": "alpha-shop"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "total_pages": 1
}
```

Products never include `cost` or `min_stock`.

---

## Public Storefront

Public, unauthenticated endpoints scoped to one active store, addressed by its slug. An unknown or inactive slug returns `404`.

### GET /public/:storeSlug/config

**Response 200**
```json
{
  "id": "uuid",
  "name": "Alpha Shop",
  "slug": "alpha-shop",
  "status": "active",
  "logo_url": "https://cdn.example.com/alpha.png",
  "description": "Fresh goods",
  "category": "grocery"
}
```

`logo_url`, `description` and `category` are empty strings when not set.

### GET /public/:storeSlug/products

Lists the store's active products. Returns the same pagination envelope as the marketplace endpoints, with products shaped without `cost`.

**Query parameters**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `per_page` | 50 | Items per page (max 100) |
| `category` | — | Exact match on product category |
| `search` | — | Case-insensitive match on product name or SKU |

Invalid or `< 1` values for `page` / `per_page` fall back to their defaults.

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

---

## Shopper Profile (Cognito)

Shoppers (mobile app users) authenticate with Amazon Cognito, not the seller JWT. Seller endpoints keep using the seller access token.

### `GET /me`

Validates the Cognito token, creates the shopper on first call (keyed by the token `sub`) and returns the profile.

**Headers:** `Authorization: Bearer <cognito access or id token>`

**Response 200**
```json
{
  "id": "uuid",
  "email": "ana@example.com",
  "name": "Ana",
  "avatar_url": "",
  "auth_provider": "cognito",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Accepted tokens** (RS256 only, verified against the user pool JWKS):
- `access` token: `client_id` must equal the app client id.
- `id` token: `aud` must equal the app client id. Only ID tokens carry `email`/`name`; an access token never clears a stored email or name.
- `iss` must be `https://cognito-idp.<region>.amazonaws.com/<userPoolId>` and the token must not be expired.

**Errors:** `401` invalid, expired or wrong-pool token; `503` Cognito is not configured (the endpoint fails closed).

**Environment variables**
| Variable | Description |
|----------|-------------|
| `COGNITO_USER_POOL_ID` | Shopper user pool id (required) |
| `COGNITO_APP_CLIENT_ID` | Mobile app client id (required) |
| `COGNITO_REGION` | Pool region (defaults to `AWS_REGION`) |
| `COGNITO_JWKS_URL` | Optional JWKS URL override (tests only) |
