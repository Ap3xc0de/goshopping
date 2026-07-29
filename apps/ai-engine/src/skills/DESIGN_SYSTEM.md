# Skill: Design System de Go Shopping

## Componentes disponibles

Estos son los ÚNICOS componentes que puedes usar. NO crees componentes nuevos.

### Layout
- `Navbar` — variant: `'transparent' | 'solid' | 'floating'`
- `Footer` — variant: `'full' | 'minimal'`
- `Container` — maxWidth, padding

### Hero (elegir UNO por tienda)
- `HeroCentered` — imagen fondo + overlay + texto centrado + CTA
- `HeroSplit` — mitad texto + mitad imagen
- `HeroSlider` — carousel de slides con imágenes + texto + CTA
- `HeroMinimal` — color sólido + texto grande + CTA
- `HeroVideo` — video fondo + overlay + texto

### Productos
- `ProductCard` — variant: `'compact' | 'expanded'`
- `ProductGrid` — columns: `2 | 3 | 4`, muestra array de ProductCard
- `ProductDetail` — página completa de producto
- `ProductQuickView` — modal rápido desde grid
- `ImageGallery` — galería con thumbnails

### Carrito
- `CartDrawer` — sidebar desde la derecha
- `CartItem` — item individual
- `CartSummary` — resumen con totales

### Checkout
- `CheckoutForm` — formulario completo
- `CheckoutSuccess` — confirmación de pedido

### Marketing
- `PromoBanner` — banner full width
- `CountdownTimer` — timer de oferta
- `NewsletterSignup` — captura email, variant: `'inline' | 'banner'`
- `TestimonialCards` — carousel de testimonios
- `TrustBadges` — iconos de confianza
- `CategoryShowcase` — grid de categorías

### Contenido
- `AboutSection` — imagen + texto
- `ContactForm` — formulario de contacto
- `FAQAccordion` — preguntas frecuentes
- `BlogCard` — card de artículo

## Regla fundamental

NUNCA escribas HTML/JSX custom cuando existe un componente.
SIEMPRE usa los componentes del design system con sus props exactas.
