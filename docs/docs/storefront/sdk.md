---
sidebar_position: 2
title: SDK del Storefront
---

# @goshopping/storefront-sdk

El SDK del storefront es la capa de abstracción entre los templates del frontend y la API pública de GoShopping. Encapsula las llamadas HTTP, el carrito client-side, los hooks de React y los tipos TypeScript en un solo paquete liviano.

## Por qué existe

Sin el SDK, cada template duplicaría la lógica de:
- Construcción de URLs de la API
- Manejo de errores HTTP
- Carrito en `localStorage`
- Hooks de React con loading/error state

El SDK resuelve esto una sola vez y todos los templates lo consumen de la misma forma.

## Instalación

El SDK es un paquete interno del monorepo. Ya está configurado en `tsconfig.json` como path alias.

```bash
# Instalar dependencias de desarrollo
cd libs/storefront-sdk
npm install
```

## Configuración

```typescript
import { GoShoppingClient } from '@goshopping/storefront-sdk';

const client = new GoShoppingClient({
  storeSlug: 'mi-tienda',           // requerido
  baseURL: 'https://api.goshopping.com', // opcional — usa NEXT_PUBLIC_API_URL por defecto
});
```

---

## API Reference — GoShoppingClient

### Constructor

```typescript
new GoShoppingClient({ storeSlug: string; baseURL?: string })
```

### Productos

#### `getProducts(params?)`

```typescript
await client.getProducts({
  page?: number;        // defecto: 1
  per_page?: number;    // defecto: 20
  category?: string;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name';
}): Promise<PaginatedResponse<Product>>
```

#### `getProduct(productId)`

```typescript
await client.getProduct('uuid-del-producto'): Promise<Product>
// Lanza NotFoundError si no existe
```

#### `getCategories()`

```typescript
await client.getCategories(): Promise<string[]>
// Extrae categorías únicas de los productos activos (ordenadas alfabéticamente)
```

### Pedidos

#### `createOrder(data)`

```typescript
await client.createOrder({
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: { street?, city?, state?, zip? };
  };
  items: Array<{ product_id: string; quantity: number }>;
  payment_method: string;
  notes?: string;
}): Promise<CreateOrderResponse>
// Response incluye id + access_token para consultar estado
```

#### `getOrderStatus(orderId, accessToken)`

```typescript
await client.getOrderStatus('order-id', 'access-token'): Promise<OrderStatus>
// El access_token se envía como query param, nunca en headers
```

### Tienda

#### `getStoreConfig()`

```typescript
await client.getStoreConfig(): Promise<StoreConfig>
// Retorna nombre, colores, logo, métodos de pago habilitados, etc.
```

---

## Hooks de React

Importar desde el mismo paquete:

```typescript
import { useProducts, useCart, useProduct, useStoreConfig, useOrderStatus } from '@goshopping/storefront-sdk';
```

### `useGoShopping(storeSlug)`

Retorna un `GoShoppingClient` memoizado (singleton por storeSlug).

```typescript
const client = useGoShopping('mi-tienda');
```

### `useCart(storeSlug)`

```typescript
const {
  cart,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  itemCount,
  isEmpty,
  subtotal,
  tax,
  total,
} = useCart('mi-tienda');
```

El componente se re-renderiza automáticamente cuando el carrito cambia.

**Ejemplo:**

```tsx
function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart('mi-tienda');
  return <button onClick={() => addItem(product)}>Agregar al carrito</button>;
}
```

### `useProducts(storeSlug, params?)`

```typescript
const {
  products,
  loading,
  error,
  total,
  page,
  totalPages,
  setPage,
  setCategory,
  setSearch,
  setSort,
  refresh,
} = useProducts('mi-tienda', { per_page: 12 });
```

### `useProduct(storeSlug, productId)`

```typescript
const { product, loading, error } = useProduct('mi-tienda', 'product-uuid');
```

### `useStoreConfig(storeSlug)`

```typescript
const { config, loading, error } = useStoreConfig('mi-tienda');
```

### `useOrderStatus(storeSlug, orderId, accessToken)`

```typescript
const { status, loading, error, refresh } = useOrderStatus(
  'mi-tienda',
  'order-id',
  'access-token',
);
```

---

## CartManager

El carrito vive completamente en el cliente (`localStorage`). No se sincroniza con el backend hasta el momento del checkout.

```typescript
import { CartManager } from '@goshopping/storefront-sdk';

const manager = new CartManager('mi-tienda', 0.19); // 19% IVA

// Agregar
manager.addItem(product, 2);

// Lanza StockError si no hay stock suficiente
try {
  manager.addItem(product, 100);
} catch (err) {
  if (err instanceof StockError) {
    console.log(`Solo quedan ${err.available} unidades`);
  }
}

// Suscribirse a cambios (para React manual)
const unsub = manager.subscribe((cart) => console.log(cart));
unsub(); // cleanup

// Calcular totales
// subtotal = Σ(price × quantity)
// tax      = subtotal × taxRate (redondeado a 2 decimales)
// total    = subtotal + tax
```

**Clave en localStorage:** `goshopping_cart_{storeSlug}`

---

## Tipos

```typescript
import type {
  Product,
  StoreConfig,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatus,
  PaginatedResponse,
  CartItem,
  Cart,
  ProductParams,
} from '@goshopping/storefront-sdk';
```

### Product

```typescript
interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;     // En la moneda de la tienda (COP por defecto)
  stock: number;
  category: string;
  images: string[];
  status: 'active' | 'out_of_stock';
  // ⚠️ NO incluye `cost` — la API pública no lo expone
}
```

---

## Errores

El SDK usa una jerarquía de errores tipados. Siempre usar `instanceof` para distinguirlos:

```typescript
import { GoShoppingError, NetworkError, NotFoundError, StockError, ValidationError } from '@goshopping/storefront-sdk';

try {
  await client.getProduct('id-inexistente');
} catch (err) {
  if (err instanceof NotFoundError) {
    // 404 — redirigir a catálogo
  } else if (err instanceof NetworkError) {
    // Sin conexión o timeout
  } else if (err instanceof GoShoppingError) {
    console.log(err.status, err.code);
  }
}
```

| Error | Status | Code | Cuándo |
|-------|--------|------|--------|
| `NetworkError` | 0 | `NETWORK_ERROR` | Sin conexión / timeout (10s) |
| `NotFoundError` | 404 | `NOT_FOUND` | Recurso no existe |
| `StockError` | 409 | `INSUFFICIENT_STOCK` | Stock insuficiente en carrito |
| `ValidationError` | 422 | `VALIDATION_ERROR` | Datos inválidos |
| `GoShoppingError` | varies | varies | Cualquier otro error de API |

### StockError

```typescript
catch (err) {
  if (err instanceof StockError) {
    console.log(err.productId);  // ID del producto
    console.log(err.available);  // Stock disponible
    console.log(err.requested);  // Cantidad solicitada
  }
}
```

---

## Utilidades

```typescript
import { formatPrice, buildImageURL, slugify, truncate } from '@goshopping/storefront-sdk';

formatPrice(59900)           // "$59.900" (COP, locale es-CO)
formatPrice(99.99, 'USD')    // "$99,99"

buildImageURL('/img/prod.jpg', 'https://cdn.mi-tienda.com')
// → "https://cdn.mi-tienda.com/img/prod.jpg"

buildImageURL('https://cdn.example.com/img.jpg')
// → "https://cdn.example.com/img.jpg" (URL absoluta — sin cambios)

slugify('Camiseta Roja XL')  // "camiseta-roja-xl"
truncate('Descripción muy larga...', 50)  // "Descripción muy larga…"
```

---

## Seguridad

:::caution Garantías de seguridad del SDK

1. **El SDK NUNCA incluye auth headers** en ninguna petición. La API pública no requiere autenticación.
2. **El SDK NUNCA expone `cost`** en el tipo `Product`. El costo de los productos es información privada del vendedor y no se incluye en ninguna respuesta pública.
3. El `access_token` del pedido se envía como query param en `/orders/{id}/status`, nunca en headers de autenticación.

:::

---

## Tests

```bash
cd libs/storefront-sdk
npm test               # ejecutar todos los tests
npm run test:coverage  # con cobertura
npm run typecheck      # solo verificación de tipos
```

Los tests cubren:
- `client.test.ts` — todas las llamadas HTTP, retry, timeout, seguridad
- `cart.test.ts` — operaciones del carrito, cálculos decimales, persistencia
- `utils.test.ts` — formatPrice, buildImageURL, slugify, truncate
