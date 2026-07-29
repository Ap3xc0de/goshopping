# Skill: API de Props de Componentes

## Navbar

```tsx
<Navbar
  storeName="Mi Tienda"
  logo="/logo.svg"
  variant="transparent"           // 'transparent' | 'solid' | 'floating'
  links={[
    { label: 'Inicio', href: '/' },
    { label: 'Catálogo', href: '/catalogo' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Contacto', href: '/contacto' },
  ]}
  cartItemCount={itemCount}
  onCartClick={() => setCartOpen(true)}
/>
```

## HeroCentered

```tsx
<HeroCentered
  title="Bienvenido a Mi Tienda"
  subtitle="Encuentra los mejores productos al mejor precio"
  ctaLabel="Ver catálogo"
  ctaHref="/catalogo"
  backgroundImage="/hero-bg.jpg"
  overlay={true}
/>
```

## HeroSplit

```tsx
<HeroSplit
  title="Nueva Colección"
  subtitle="Descubre nuestros productos exclusivos"
  ctaLabel="Comprar ahora"
  ctaHref="/catalogo"
  image="/hero-product.jpg"
  imageAlt="Producto destacado"
  imagePosition="right"           // 'left' | 'right'
/>
```

## HeroSlider

```tsx
<HeroSlider
  slides={[
    {
      title: 'Oferta del día',
      subtitle: 'Hasta 50% descuento',
      ctaLabel: 'Ver ofertas',
      ctaHref: '/ofertas',
      image: '/slide-1.jpg',
    },
    {
      title: 'Nueva colección',
      subtitle: 'Llega lo último',
      ctaLabel: 'Explorar',
      ctaHref: '/catalogo',
      image: '/slide-2.jpg',
    },
  ]}
  autoPlay={true}
  interval={4000}
/>
```

## HeroMinimal

```tsx
<HeroMinimal
  title="Nombre de la Tienda"
  subtitle="Tagline corto aquí"
  ctaLabel="Explorar"
  ctaHref="/catalogo"
  backgroundColor="var(--brand-primary)"
/>
```

## ProductGrid

```tsx
<ProductGrid
  products={products}
  columns={3}                     // 2 | 3 | 4
  loading={loading}
  onAddToCart={(product) => addItem(product)}
/>
```

## ProductCard

```tsx
<ProductCard
  product={product}
  variant="expanded"              // 'compact' | 'expanded'
  onAddToCart={(product) => addItem(product)}
  showRating={true}
  showBadge={true}                // OFERTA, NUEVO
/>
```

## ProductDetail

```tsx
<ProductDetail
  product={product}
  loading={loading}
  onAddToCart={(product, qty) => addItem(product, qty)}
  relatedProducts={relatedProducts}
/>
```

## CartDrawer

```tsx
<CartDrawer
  open={cartOpen}
  onClose={() => setCartOpen(false)}
  cart={cart}
  onRemoveItem={(id) => removeItem(id)}
  onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
  onCheckout={() => router.push('/checkout')}
/>
```

## CartSummary

```tsx
<CartSummary
  subtotal={subtotal}
  tax={tax}
  total={total}
  onCheckout={() => router.push('/checkout')}
/>
```

## CheckoutForm

```tsx
<CheckoutForm
  storeSlug={storeSlug}
  cart={cart}
  onSuccess={(orderId, accessToken) => router.push(`/pedido/${orderId}`)}
/>
```

## PromoBanner

```tsx
<PromoBanner
  message="Envío gratis en compras mayores a $500"
  ctaLabel="Ver productos"
  ctaHref="/catalogo"
  variant="primary"               // 'primary' | 'accent' | 'dark'
  dismissible={false}
/>
```

## CountdownTimer

```tsx
<CountdownTimer
  targetDate={new Date('2025-12-31T23:59:59')}
  label="La oferta termina en:"
  onExpire={() => setOfferExpired(true)}
/>
```

## NewsletterSignup

```tsx
<NewsletterSignup
  title="Suscríbete"
  subtitle="Recibe ofertas exclusivas"
  ctaLabel="Suscribirme"
  variant="banner"                // 'inline' | 'banner'
  onSubmit={async (email) => { /* handle */ }}
/>
```

## TestimonialCards

```tsx
<TestimonialCards
  testimonials={[
    {
      name: 'María García',
      role: 'Cliente verificada',
      content: 'Excelente calidad y entrega rápida.',
      rating: 5,
      avatar: '/avatars/maria.jpg',
    },
  ]}
  autoPlay={true}
/>
```

## TrustBadges

```tsx
<TrustBadges
  badges={[
    { icon: 'shield', label: 'Compra segura' },
    { icon: 'truck', label: 'Envío gratis desde $500' },
    { icon: 'refresh', label: 'Devoluciones gratis' },
    { icon: 'headset', label: 'Soporte 24/7' },
  ]}
/>
```

## CategoryShowcase

```tsx
<CategoryShowcase
  title="Explora por categoría"
  categories={[
    { name: 'Ropa', image: '/cat-ropa.jpg', href: '/catalogo?categoria=ropa' },
    { name: 'Accesorios', image: '/cat-acc.jpg', href: '/catalogo?categoria=accesorios' },
    { name: 'Calzado', image: '/cat-cal.jpg', href: '/catalogo?categoria=calzado' },
  ]}
  columns={3}
/>
```

## AboutSection

```tsx
<AboutSection
  title="Nuestra historia"
  content="Párrafo descriptivo del negocio..."
  image="/about.jpg"
  imageAlt="Nuestro equipo"
  imagePosition="right"           // 'left' | 'right'
  ctaLabel="Conocernos más"
  ctaHref="/nosotros"
/>
```

## FAQAccordion

```tsx
<FAQAccordion
  title="Preguntas frecuentes"
  items={[
    {
      question: '¿Cuánto tarda el envío?',
      answer: 'El envío estándar tarda 3-5 días hábiles.',
    },
    {
      question: '¿Aceptan devoluciones?',
      answer: 'Sí, tienes 30 días para devolver tu producto.',
    },
  ]}
/>
```

## Footer

```tsx
<Footer
  variant="full"                  // 'full' | 'minimal'
  storeName="Mi Tienda"
  logo="/logo.svg"
  links={[
    { label: 'Política de privacidad', href: '/privacidad' },
    { label: 'Términos y condiciones', href: '/terminos' },
    { label: 'Contacto', href: '/contacto' },
  ]}
  social={[
    { platform: 'instagram', href: 'https://instagram.com/mitienda' },
    { platform: 'facebook', href: 'https://facebook.com/mitienda' },
  ]}
  copyright={`© ${new Date().getFullYear()} Mi Tienda. Todos los derechos reservados.`}
/>
```

## Container

```tsx
<Container maxWidth="xl" className="py-16">
  {/* contenido */}
</Container>
```
