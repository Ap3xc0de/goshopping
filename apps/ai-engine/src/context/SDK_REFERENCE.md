# Storefront SDK — Referencia completa

## Instalación

```tsx
import { useProducts, useProduct, useCart, useStoreConfig, useOrderStatus } from '@goshopping/storefront-sdk';
```

## Regla fundamental

**SIEMPRE** usa estos hooks. **NUNCA** hagas `fetch()` directo a la API.

---

## useProducts(storeSlug, params?)

Obtiene productos paginados con filtros opcionales.

```tsx
const {
  products,    // Product[]
  loading,     // boolean
  error,       // Error | null
  total,       // number — total de productos
  totalPages,  // number
  setPage,     // (page: number) => void
  setCategory, // (category: string | null) => void
  setSearch,   // (search: string) => void
  setSort,     // (sort: string) => void
  refresh,     // () => void — forzar recarga
} = useProducts('mi-tienda', { page: 1, per_page: 12 });
```

**Uso típico — grid de catálogo:**

```tsx
export default function CatalogoPage({ params }: { params: { slug: string } }) {
  const { products, loading, totalPages, setPage, setCategory } = useProducts(params.slug);

  return (
    <>
      <ProductGrid
        products={products}
        loading={loading}
        columns={3}
        onAddToCart={(p) => addItem(p)}
      />
    </>
  );
}
```

---

## useProduct(storeSlug, productId)

Obtiene un producto individual por ID.

```tsx
const {
  product,  // Product | null
  loading,  // boolean
  error,    // Error | null
} = useProduct('mi-tienda', productId);
```

---

## useCart(storeSlug)

Manejo del carrito client-side (localStorage). Persiste entre navegaciones.

```tsx
const {
  cart,            // Cart — { items: CartItem[], ... }
  addItem,         // (product: Product, quantity?: number) => void
  removeItem,      // (productId: string) => void
  updateQuantity,  // (productId: string, quantity: number) => void
  clearCart,       // () => void
  itemCount,       // number — total de ítems
  isEmpty,         // boolean
  subtotal,        // number
  tax,             // number
  total,           // number
} = useCart('mi-tienda');
```

**Uso típico:**

```tsx
const { addItem, itemCount } = useCart(storeSlug);

// En Navbar:
<Navbar cartItemCount={itemCount} onCartClick={() => setCartOpen(true)} />

// En ProductCard:
<ProductCard
  product={product}
  onAddToCart={(p) => addItem(p)}
/>
```

---

## useStoreConfig(storeSlug)

Configuración pública de la tienda.

```tsx
const {
  config,   // StoreConfig | null
  loading,  // boolean
  error,    // Error | null
} = useStoreConfig('mi-tienda');
```

**Uso típico — aplicar tema dinámico:**

```tsx
export default function StoreLayout({ storeSlug, children }: Props) {
  const { config } = useStoreConfig(storeSlug);

  return (
    <div
      style={{
        '--brand-primary': config?.config.colors?.primary ?? '#000000',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
```

---

## useOrderStatus(storeSlug, orderId, accessToken)

Estado de un pedido después del checkout.

```tsx
const {
  status,   // OrderStatus | null
  loading,  // boolean
  refresh,  // () => void — re-fetch manual
} = useOrderStatus('mi-tienda', orderId, accessToken);
```

**Uso típico — página de confirmación:**

```tsx
export default function PedidoPage({ params }: { params: { id: string } }) {
  const accessToken = /* from session/url */;
  const { status, loading } = useOrderStatus(params.slug, params.id, accessToken);

  return <CheckoutSuccess order={status} loading={loading} />;
}
```
