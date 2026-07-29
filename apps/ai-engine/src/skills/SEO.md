# Skill: SEO para Tiendas

## Metadatos obligatorios (Next.js Metadata API)

```tsx
// app/layout.tsx o app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Nombre de la Tienda',
    template: '%s | Nombre de la Tienda',
  },
  description: 'Descripción del negocio, máximo 155 caracteres. Clara, con palabras clave relevantes.',
  keywords: ['palabra clave 1', 'palabra clave 2', 'ciudad'],
  openGraph: {
    type: 'website',
    siteName: 'Nombre de la Tienda',
    title: 'Nombre de la Tienda — Tagline',
    description: 'Descripción para redes sociales.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nombre de la Tienda',
    description: 'Descripción para Twitter.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

## Schema.org (JSON-LD)

### HomePage — Organization

```tsx
// En el componente HomePage
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: storeName,
  url: process.env.NEXT_PUBLIC_STORE_URL,
  logo: logoUrl,
  sameAs: [instagramUrl, facebookUrl].filter(Boolean),
};

// Uso:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
/>
```

### Página de Producto — Product

```tsx
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images,
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'MXN',
    availability:
      product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
  },
};
```

## URLs amigables

| Página | URL correcta |
|--------|-------------|
| Catálogo | `/catalogo` |
| Producto | `/producto/[slug]` |
| Categoría | `/catalogo/[categoria]` |
| Carrito | `/carrito` |
| Checkout | `/checkout` |
| Pedido | `/pedido/[id]` |
| Nosotros | `/nosotros` |
| Contacto | `/contacto` |

**NUNCA** usar `/products`, `/items`, `/shop` — usar español.

## Imágenes con next/image

```tsx
import Image from 'next/image';

// SIEMPRE así — nunca <img>
<Image
  src={product.images[0]}
  alt={`${product.name} — foto principal`}
  width={600}
  height={600}
  priority={isAboveFold}   // true solo para la imagen hero
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

## Fuentes con next/font

Ver `TYPOGRAPHY.md` — **NUNCA** `@import` en CSS para fuentes.
