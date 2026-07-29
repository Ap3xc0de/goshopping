# @goshopping/storefront-sdk

SDK interno de Go Shopping para comunicar las tiendas generadas con el Core API. Es la **única** forma en que una tienda pública habla con el backend — nunca URLs directas.

## Estructura

```
src/
├── index.ts      # Export público
├── client.ts     # GoShoppingClient — llamadas HTTP al Core API
├── types.ts      # Tipos: Product, Order, StoreConfig, Cart, etc.
├── cart.ts       # CartManager — carrito client-side (localStorage)
├── errors.ts     # Errores tipados
├── utils.ts      # formatPrice, buildImageURL, slugify, truncate
└── hooks.ts      # React hooks: useProducts, useCart, useProduct, etc.
```

## Uso rápido

```typescript
import { GoShoppingClient, useProducts, useCart } from '@goshopping/storefront-sdk';

// Directo
const client = new GoShoppingClient({ storeSlug: 'mi-tienda' });
const products = await client.getProducts({ per_page: 12 });

// Con hooks de React
function CatalogPage({ storeSlug }: { storeSlug: string }) {
  const { products, loading, setPage } = useProducts(storeSlug);
  const { addItem, itemCount } = useCart(storeSlug);
  // ...
}
```

## Tests

```bash
npm test              # 50 tests en 3 suites
npm run test:coverage # con cobertura
npm run typecheck     # solo verificación de tipos
```

## Seguridad

- El SDK **NUNCA** incluye headers de autenticación — la API pública no requiere auth.
- El SDK **NUNCA** expone `cost` en `Product` — es información privada del vendedor.
- El `access_token` de pedidos se envía como query param, no en headers.

## Documentación completa

Ver [docs/docs/storefront/sdk.md](../../docs/docs/storefront/sdk.md) o el Docusaurus del proyecto.
