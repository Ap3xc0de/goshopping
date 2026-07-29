# API Pública del Core — Referencia para tiendas generadas

## ⚠️ Regla fundamental

**NUNCA** hacer `fetch()` directo. **SIEMPRE** usar el storefront-sdk:

```tsx
import { useProducts, useProduct, useCart, useStoreConfig } from '@goshopping/storefront-sdk';
```

La URL base se configura automáticamente desde `NEXT_PUBLIC_API_URL`.

## Endpoints disponibles (solo lectura pública)

### Catálogo

```
GET /public/:storeSlug/products
  Query params:
    - page: number (default: 1)
    - per_page: number (default: 20, max: 100)
    - category: string (filtrar por categoría)
    - search: string (búsqueda de texto)
    - sort: 'price_asc' | 'price_desc' | 'name_asc' | 'created_desc'
  Response: PaginatedResponse<Product>

GET /public/:storeSlug/products/:id
  Response: Product
```

### Pedidos

```
POST /public/:storeSlug/orders
  Body: CreateOrderRequest
  Response: CreateOrderResponse  (incluye access_token)

GET /public/:storeSlug/orders/:id/status
  Headers: Authorization: Bearer <access_token>
  Response: OrderStatus
```

### Configuración pública

```
GET /public/:storeSlug/config
  Response: StoreConfig (nombre, slug, colores, logo, métodos de pago)
```

## Datos que NUNCA están en la API pública

- `cost` — costo del producto para el vendedor
- Datos de integraciones (Stripe secret key, etc.)
- API keys o tokens del vendedor
- Métricas internas de la tienda
- Datos de otros vendedores

## Tipos relevantes (desde storefront-sdk)

```tsx
interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;       // precio en centavos o decimal, verificar con config
  stock: number;
  category: string;
  images: string[];
  status: 'active' | 'out_of_stock';
}

interface StoreConfig {
  name: string;
  slug: string;
  config: {
    colors?: { primary?: string; secondary?: string; accent?: string };
    logo_url?: string;
    payment_methods?: string[];
  };
}
```
