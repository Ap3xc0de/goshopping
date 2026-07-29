# GoShopping Design System Components

Complete component library for the GoShopping storefront, built with Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, framer-motion, and lucide-react.

## 📦 Components Overview

### Layout Components (`components/layout/`)
- **Container** - Responsive container with configurable max-widths
- **Navbar** - Adaptive navigation with mobile menu, search, and cart
- **Footer** - Full or minimal footer with newsletter and social links

### Hero Components (`components/hero/`)
- **HeroCentered** - Full-screen centered hero with background image
- **HeroSplit** - Two-column layout with text and image
- **HeroSlider** - Auto-playing carousel with multiple slides
- **HeroMinimal** - Simple, clean hero with solid background
- **HeroVideo** - Full-screen video background hero

### Product Components (`components/product/`)
- **ProductCard** - Rich product card with hover effects and ratings
- **ProductGrid** - Responsive grid with loading states
- **ProductDetail** - Complete product page with gallery and tabs
- **ProductQuickView** - Modal quick-view dialog
- **ImageGallery** - Product image gallery with thumbnails

### Cart Components (`components/cart/`)
- **CartItem** - Individual cart item with quantity controls
- **CartDrawer** - Slide-in cart with summary
- **CartSummary** - Order summary with discount codes

### Checkout Components (`components/checkout/`)
- **CheckoutForm** - Complete checkout flow with validation
- **CheckoutSuccess** - Order confirmation screen

### Marketing Components (`components/marketing/`)
- **PromoBanner** - Dismissible announcement banner
- **CountdownTimer** - Animated countdown for offers
- **NewsletterSignup** - Email subscription form
- **TestimonialCards** - Carousel of customer reviews
- **TrustBadges** - Trust indicators (shipping, security, etc.)
- **CategoryShowcase** - Grid of product categories

### Content Components (`components/content/`)
- **AboutSection** - Two-column about page layout
- **ContactForm** - Contact form with validation
- **FAQAccordion** - Collapsible FAQ list
- **BlogCard** - Blog post preview card

### State Components (`components/states/`)
- **LoadingGrid** - Skeleton loading state for grids
- **EmptySearch** - Empty search results screen
- **ErrorState** - Error message with retry action

## 🎨 Design Tokens

All components use CSS custom properties defined in `src/styles/theme.css`:

```css
--brand-primary: HSL color
--brand-accent: HSL color
--container-max: Max width
--container-padding: Horizontal padding
```

## 🚀 Usage Examples

### Layout

```tsx
import { Container, Navbar, Footer } from "@/components/layout";

<Navbar
  variant="floating"
  logo={{ text: "GoShopping", href: "/" }}
  links={[
    { label: "Inicio", href: "/" },
    { label: "Productos", href: "/products" },
  ]}
  cartCount={3}
  onCartClick={() => setCartOpen(true)}
/>

<Container maxWidth="xl">
  {/* Your content */}
</Container>

<Footer
  variant="full"
  storeName="GoShopping"
  tagline="Tu tienda online de confianza"
  sections={[
    {
      title: "Ayuda",
      links: [
        { label: "FAQ", href: "/faq" },
        { label: "Envíos", href: "/shipping" },
      ],
    },
  ]}
  newsletterEnabled
/>
```

### Hero

```tsx
import { HeroCentered, HeroSlider } from "@/components/hero";

<HeroCentered
  title="Bienvenido a GoShopping"
  subtitle="Los mejores productos al mejor precio"
  ctaLabel="Ver productos"
  ctaHref="/products"
  backgroundImage="/hero-bg.jpg"
  overlayOpacity={0.5}
/>

<HeroSlider
  slides={[
    {
      title: "Nuevas ofertas",
      ctaLabel: "Comprar ahora",
      ctaHref: "/ofertas",
      backgroundImage: "/slide1.jpg",
    },
  ]}
  autoPlayInterval={5000}
/>
```

### Products

```tsx
import { ProductGrid, ProductCard } from "@/components/product";

const products = [
  {
    id: "1",
    name: "Producto Example",
    price: 50000,
    originalPrice: 75000,
    image: "/product.jpg",
    badge: "OFERTA",
    rating: 4.5,
    reviewCount: 120,
    href: "/products/1",
  },
];

<ProductGrid
  products={products}
  columns={3}
  loading={false}
/>
```

### Cart

```tsx
import { CartDrawer } from "@/components/cart";

<CartDrawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  items={cartItems}
  onQuantityChange={(id, qty) => updateQuantity(id, qty)}
  onRemove={(id) => removeItem(id)}
  onCheckout={() => router.push("/checkout")}
/>
```

### Checkout

```tsx
import { CheckoutForm, CheckoutSuccess } from "@/components/checkout";
import { CartSummary } from "@/components/cart";

<CheckoutForm
  onSubmit={(data) => processOrder(data)}
  isLoading={processing}
  cartSummary={<CartSummary items={cartItems} />}
/>

// After successful order
<CheckoutSuccess
  orderNumber="ORD-12345"
  items={orderItems}
  total={150000}
  onContinueShopping={() => router.push("/")}
/>
```

### Marketing

```tsx
import {
  PromoBanner,
  CountdownTimer,
  TestimonialCards,
  CategoryShowcase,
} from "@/components/marketing";

<PromoBanner
  message="¡Envío gratis en compras mayores a $50.000!"
  ctaLabel="Ver más"
  ctaHref="/promociones"
  dismissible
/>

<CountdownTimer
  targetDate="2026-12-31T23:59:59"
  title="¡Oferta por tiempo limitado!"
  onExpire={() => console.log("Expired")}
/>

<TestimonialCards
  testimonials={[
    {
      name: "María García",
      text: "Excelente servicio y productos de calidad",
      rating: 5,
      role: "Cliente verificada",
    },
  ]}
  autoPlay
  interval={4000}
/>

<CategoryShowcase
  categories={[
    {
      name: "Electrónica",
      image: "/cat-electronics.jpg",
      href: "/categories/electronics",
      productCount: 150,
    },
  ]}
  columns={3}
/>
```

### Content

```tsx
import { AboutSection, ContactForm, FAQAccordion } from "@/components/content";

<AboutSection
  title="Sobre nosotros"
  description="Somos una tienda online comprometida..."
  image="/about.jpg"
  imagePosition="right"
  values={[
    {
      icon: "check",
      title: "Calidad",
      description: "Productos verificados",
    },
  ]}
/>

<ContactForm
  onSubmit={(data) => sendMessage(data)}
  isLoading={sending}
/>

<FAQAccordion
  items={[
    {
      question: "¿Cuánto tarda el envío?",
      answer: "El envío tarda entre 3-5 días hábiles",
    },
  ]}
/>
```

### States

```tsx
import { LoadingGrid, EmptySearch, ErrorState } from "@/components/states";

{loading && <LoadingGrid count={6} columns={3} />}

{!loading && products.length === 0 && (
  <EmptySearch query={searchTerm} onReset={() => setSearchTerm("")} />
)}

{error && (
  <ErrorState
    title="Error al cargar productos"
    message={error.message}
    onRetry={() => refetch()}
  />
)}
```

## 🎯 Key Features

- ✅ **Type-safe** - Full TypeScript support with explicit interfaces
- ✅ **Responsive** - Mobile-first design with breakpoints
- ✅ **Accessible** - Built on Radix UI primitives
- ✅ **Animated** - Smooth transitions with framer-motion
- ✅ **Themeable** - CSS custom properties for easy customization
- ✅ **i18n ready** - Spanish labels, easy to translate
- ✅ **Colombian currency** - COP formatting with Intl.NumberFormat

## 🛠️ Technical Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + CSS Custom Properties
- **Components**: shadcn/ui (Radix UI)
- **Icons**: lucide-react
- **Animation**: framer-motion
- **Carousel**: embla-carousel-react + embla-carousel-autoplay
- **Theme**: next-themes
- **Utils**: clsx + tailwind-merge (cn function)

## 📝 Conventions

1. **Named exports** - All components use named exports (not default)
2. **Props interfaces** - Explicit TypeScript interfaces for all props
3. **CSS custom properties** - Use `hsl(var(--brand-primary))` not hardcoded colors
4. **className merging** - Always use `cn()` from `@/lib/utils`
5. **Responsive breakpoints** - sm (640px), md (768px), lg (1024px), xl (1280px)
6. **Currency formatting** - Always use `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`

## 🔧 Customization

To customize the design system, edit:

- **Colors**: `src/styles/theme.css` (CSS variables)
- **Tailwind config**: `tailwind.config.ts` (brand tokens)
- **Global styles**: `src/app/globals.css` (shadcn base)

## 📦 Bundle Size Optimization

- All components are tree-shakeable
- Use dynamic imports for heavy components:

```tsx
const ProductDetail = dynamic(() =>
  import("@/components/product").then((mod) => mod.ProductDetail)
);
```

## 🚨 Important Notes

- Footer component: "use client" directive removed (needs manual add if using state)
- Navbar requires Sheet, NavigationMenu from shadcn
- All carousels need embla-carousel-autoplay installed
- ThemeProvider requires next-themes (already installed)

## 📚 Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [framer-motion Documentation](https://www.framer.com/motion)
- [Radix UI Documentation](https://www.radix-ui.com)
