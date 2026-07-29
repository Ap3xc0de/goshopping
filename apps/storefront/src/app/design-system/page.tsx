"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { HeroCentered } from "@/components/hero/HeroCentered";
import { HeroSplit } from "@/components/hero/HeroSplit";
import { HeroMinimal } from "@/components/hero/HeroMinimal";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartSummary } from "@/components/cart/CartSummary";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { TrustBadges } from "@/components/marketing/TrustBadges";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { TestimonialCards } from "@/components/marketing/TestimonialCards";
import { CategoryShowcase } from "@/components/marketing/CategoryShowcase";
import { CountdownTimer } from "@/components/marketing/CountdownTimer";
import { FAQAccordion } from "@/components/content/FAQAccordion";
import { AboutSection } from "@/components/content/AboutSection";
import { BlogCard } from "@/components/content/BlogCard";
import { ContactForm } from "@/components/content/ContactForm";
import { LoadingGrid } from "@/components/states/LoadingGrid";
import { EmptySearch } from "@/components/states/EmptySearch";
import { ErrorState } from "@/components/states/ErrorState";
import { CheckoutSuccess } from "@/components/checkout/CheckoutSuccess";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// â”€â”€ Demo data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PALETTES = [
  { name: "Verde (Default)", primary: "142 71% 45%", secondary: "215 28% 17%", accent: "24 95% 53%" },
  { name: "Azul Tech", primary: "217 91% 60%", secondary: "222 47% 11%", accent: "168 76% 42%" },
  { name: "Rosa Moda", primary: "330 81% 60%", secondary: "240 5% 15%", accent: "42 100% 56%" },
];

const DEMO_PRODUCTS = [
  { id: "1", name: "Camiseta Premium", price: 89000, originalPrice: 120000, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop", badge: "OFERTA", rating: 4.5, reviewCount: 128 },
  { id: "2", name: "Zapatos Deportivos", price: 245000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop", badge: "NUEVO", rating: 4.8, reviewCount: 54 },
  { id: "3", name: "Bolso Cuero Artesanal", price: 380000, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=500&fit=crop", rating: 4.2, reviewCount: 37 },
  { id: "4", name: "Reloj Minimalista", price: 195000, originalPrice: 220000, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop", rating: 4.7, reviewCount: 93 },
  { id: "5", name: "Lentes de Sol", price: 75000, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&fit=crop", rating: 4.1, reviewCount: 21 },
  { id: "6", name: "Gorra Streetwear", price: 45000, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=500&fit=crop", badge: "NUEVO", rating: 4.0, reviewCount: 15 },
];

const DEMO_TESTIMONIALS = [
  { name: "MarÃ­a GarcÃ­a", text: "Excelente calidad y llegÃ³ sÃºper rÃ¡pido. Definitivamente volverÃ­a a comprar aquÃ­.", rating: 5, role: "Cliente frecuente", avatar: "https://i.pravatar.cc/100?img=1" },
  { name: "Carlos RodrÃ­guez", text: "Los productos son tal como se muestran en las fotos. Muy satisfecho con mi compra.", rating: 4, role: "Cliente verificado", avatar: "https://i.pravatar.cc/100?img=3" },
  { name: "Ana MartÃ­nez", text: "AtenciÃ³n al cliente de primera. Me ayudaron con mi pedido y la soluciÃ³n fue inmediata.", rating: 5, role: "Cliente verificado", avatar: "https://i.pravatar.cc/100?img=5" },
];

const DEMO_CATEGORIES = [
  { name: "Ropa", image: "https://images.unsplash.com/photo-1467043198406-dc953a3defa0?w=400&h=400&fit=crop", href: "/ropa", productCount: 148 },
  { name: "Zapatos", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", href: "/zapatos", productCount: 73 },
  { name: "Accesorios", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", href: "/accesorios", productCount: 95 },
];

const DEMO_FAQ = [
  { question: "Â¿CuÃ¡nto tarda el envÃ­o?", answer: "Los pedidos se despachan en 24 horas hÃ¡biles. Los tiempos de entrega son 2-5 dÃ­as en ciudades principales y 5-8 dÃ­as en municipios." },
  { question: "Â¿Puedo devolver un producto?", answer: "SÃ­. Tienes 30 dÃ­as desde la fecha de compra para solicitar una devoluciÃ³n o cambio, siempre que el producto estÃ© en su estado original." },
  { question: "Â¿QuÃ© mÃ©todos de pago aceptan?", answer: "Aceptamos tarjetas de crÃ©dito/dÃ©bito (Visa, Mastercard), PSE, y pago contra entrega." },
  { question: "Â¿CÃ³mo rastreo mi pedido?", answer: "Al confirmar tu pedido recibirÃ¡s un correo con el nÃºmero de seguimiento para rastrear en tiempo real." },
];

const NAV_LINKS = [
  { label: "Tienda", href: "#productos" },
  { label: "CategorÃ­as", href: "#categorias" },
  { label: "Ofertas", href: "#ofertas" },
  { label: "Nosotros", href: "#nosotros" },
];

// â”€â”€ Sidebar categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SECTIONS = [
  "Layout", "Hero", "Productos", "Carrito",
  "Marketing", "Contenido", "Estados", "Checkout",
];

// â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PreviewPage() {
  const [palette, setPalette] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([
    { id: "1", name: "Camiseta Premium", price: 89000, quantity: 2, image: DEMO_PRODUCTS[0].image, variant: "Talla M" },
    { id: "2", name: "Zapatos Deportivos", price: 245000, quantity: 1, image: DEMO_PRODUCTS[1].image },
  ]);
  const [activeSection, setActiveSection] = useState("Layout");

  // Apply palette to CSS vars
  const applyPalette = (index: number) => {
    const p = PALETTES[index];
    document.documentElement.style.setProperty("--brand-primary", p.primary);
    document.documentElement.style.setProperty("--brand-secondary", p.secondary);
    document.documentElement.style.setProperty("--brand-accent", p.accent);
    setPalette(index);
  };

  const handleQuantityChange = (id: string, qty: number) => {
    setCartItems(prev => qty === 0
      ? prev.filter(i => i.id !== id)
      : prev.map(i => i.id === id ? { ...i, quantity: qty } : i)
    );
  };

  const handleRemove = (id: string) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed controls */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 bg-white rounded-xl shadow-xl border p-4 w-56">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paleta de colores</p>
        {PALETTES.map((p, i) => (
          <button
            key={i}
            onClick={() => applyPalette(i)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
              palette === i
                ? "bg-[hsl(var(--brand-primary))] text-white font-medium"
                : "hover:bg-muted"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Sidebar nav */}
      <div className="fixed left-0 top-0 h-full w-48 bg-white border-r shadow-sm z-50 overflow-y-auto hidden lg:block pt-6">
        <div className="px-4 mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Design System</p>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {SECTIONS.map(section => (
            <a
              key={section}
              href={`#section-${section.toLowerCase()}`}
              onClick={() => setActiveSection(section)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section
                  ? "bg-[hsl(var(--brand-primary)/0.1)] text-[hsl(var(--brand-primary))] font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {section}
            </a>
          ))}
        </nav>
      </div>

      {/* Main content (offset for sidebar) */}
      <div className="lg:ml-48">

        {/* Header */}
        <div className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] text-white px-8 py-12">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">Design System Preview</Badge>
            <h1 className="text-4xl font-bold mb-2">GoShopping Design System</h1>
            <p className="text-lg text-white/80">
              Componentes de la base visual que la IA personaliza. CambiÃ¡ la paleta con los controles a la derecha.
            </p>
          </div>
        </div>

        {/* â”€â”€ SECTION: Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-layout" className="py-16 border-b">
          <Container>
            <SectionHeader title="Layout" description="Navbar, Footer, Container" />

            <div className="mb-8">
              <ComponentLabel>Navbar â€” variant=&quot;solid&quot;</ComponentLabel>
            </div>
            <div className="border rounded-xl overflow-hidden mb-8">
              <Navbar
                variant="solid"
                logo={{ text: "MiTienda" }}
                links={NAV_LINKS}
                cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
                onCartClick={() => setCartOpen(true)}
              />
            </div>

            <div className="mb-8">
              <ComponentLabel>Footer â€” variant=&quot;full&quot;</ComponentLabel>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <Footer
                variant="full"
                storeName="MiTienda"
                tagline="Tu tienda favorita en Colombia"
                sections={[
                  { title: "Empresa", links: [{ label: "Nosotros", href: "#" }, { label: "Blog", href: "#" }] },
                  { title: "Soporte", links: [{ label: "FAQ", href: "#" }, { label: "Contacto", href: "#" }] },
                ]}
                social={[
                  { platform: "instagram", href: "#" },
                  { platform: "facebook", href: "#" },
                  { platform: "tiktok", href: "#" },
                ]}
                newsletterEnabled
              />
            </div>
          </Container>
        </section>

        {/* â”€â”€ SECTION: Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-hero" className="py-16 border-b bg-muted/30">
          <Container>
            <SectionHeader title="Hero" description="5 variantes para diferentes estilos de tienda" />
          </Container>

          <div className="mb-12">
            <Container><ComponentLabel>HeroMinimal â€” sin imagen, solo color</ComponentLabel></Container>
            <HeroMinimal
              title="Bienvenido a MiTienda"
              subtitle="Los mejores productos con entrega a todo Colombia"
              ctaLabel="Ver colecciÃ³n"
              ctaHref="#productos"
            />
          </div>

          <Container>
            <div className="mb-12">
              <ComponentLabel>HeroCentered â€” imagen de fondo + overlay</ComponentLabel>
              <div className="rounded-xl overflow-hidden h-[500px] relative">
                <HeroCentered
                  title="Nueva ColecciÃ³n 2026"
                  subtitle="Descubre las Ãºltimas tendencias en moda colombiana"
                  ctaLabel="Comprar ahora"
                  ctaHref="#"
                  ctaSecondaryLabel="Ver catÃ¡logo"
                  ctaSecondaryHref="#"
                  backgroundImage="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop"
                  minHeight="500px"
                />
              </div>
            </div>

            <div className="mb-12">
              <ComponentLabel>HeroSplit â€” texto + imagen lado a lado</ComponentLabel>
              <div className="border rounded-xl overflow-hidden">
                <HeroSplit
                  title="Calidad Artesanal Colombiana"
                  description="Cada producto es fabricado a mano por artesanos locales con dÃ©cadas de experiencia en sus oficios."
                  ctaLabel="Explorar productos"
                  ctaHref="#"
                  ctaSecondaryLabel="Conocer mÃ¡s"
                  ctaSecondaryHref="#"
                  image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop"
                />
              </div>
            </div>
          </Container>
        </section>

        {/* â”€â”€ SECTION: Productos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-productos" className="py-16 border-b">
          <Container>
            <SectionHeader title="Productos" description="Cards, Grids, Detalle, Quick View, GalerÃ­a" />

            <ComponentLabel>ProductCard â€” variante expanded (hover para ver botÃ³n)</ComponentLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {DEMO_PRODUCTS.slice(0, 4).map(p => (
                <ProductCard key={p.id} {...p} onAddToCart={(id) => console.log("Add:", id)} />
              ))}
            </div>

            <ComponentLabel>ProductGrid â€” 3 columnas con loading skeleton</ComponentLabel>
            <div className="mb-8">
              <ProductGrid products={DEMO_PRODUCTS} columns={3} />
            </div>

            <ComponentLabel>ProductGrid â€” loading state</ComponentLabel>
            <ProductGrid products={[]} columns={3} loading skeletonCount={3} />
          </Container>
        </section>

        {/* â”€â”€ SECTION: Carrito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-carrito" className="py-16 border-b bg-muted/30">
          <Container>
            <SectionHeader title="Carrito" description="CartDrawer, CartSummary, CartItem" />

            <div className="flex gap-4 mb-8">
              <Button
                onClick={() => setCartOpen(true)}
                style={{ backgroundColor: "hsl(var(--brand-primary))", color: "white" }}
              >
                Abrir CartDrawer ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)
              </Button>
            </div>

            <ComponentLabel>CartSummary (para checkout)</ComponentLabel>
            <div className="max-w-md">
              <CartSummary
                items={cartItems.map(i => ({ ...i, image: i.image }))}
                onApplyDiscount={(code) => console.log("Discount:", code)}
              />
            </div>
          </Container>
        </section>

        {/* â”€â”€ SECTION: Marketing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-marketing" className="py-16 border-b">
          <Container>
            <SectionHeader title="Marketing" description="PromoBanner, CountdownTimer, Newsletter, Testimonios, TrustBadges, CategorÃ­as" />
          </Container>

          <PromoBanner
            message="ðŸŽ‰ ENVÃO GRATIS en compras mayores a $150.000 â€” VÃ¡lido esta semana"
            ctaLabel="Aprovechar"
            ctaHref="#"
          />

          <Container>
            <div className="my-8">
              <ComponentLabel>TrustBadges</ComponentLabel>
              <TrustBadges />
            </div>

            <Separator className="my-8" />

            <ComponentLabel>CountdownTimer</ComponentLabel>
            <div className="mb-8">
              <CountdownTimer
                targetDate={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)}
                title="âš¡ Oferta relÃ¡mpago termina en:"
              />
            </div>

            <Separator className="my-8" />

            <ComponentLabel>CategoryShowcase â€” 3 columnas</ComponentLabel>
            <div className="mb-8">
              <CategoryShowcase categories={DEMO_CATEGORIES} columns={3} />
            </div>

            <Separator className="my-8" />

            <ComponentLabel>TestimonialCards â€” auto-play</ComponentLabel>
            <div className="mb-8">
              <TestimonialCards testimonials={DEMO_TESTIMONIALS} />
            </div>

            <Separator className="my-8" />

            <ComponentLabel>NewsletterSignup â€” variante inline</ComponentLabel>
            <div className="mb-8">
              <NewsletterSignup
                title="No te pierdas nuestras ofertas"
                description="SuscrÃ­bete y recibe descuentos exclusivos y novedades"
              />
            </div>

            <ComponentLabel>NewsletterSignup â€” variante banner</ComponentLabel>
            <div className="mb-8 rounded-xl overflow-hidden">
              <NewsletterSignup
                title="Ofertas solo para suscriptores"
                description="Ãšnete a mÃ¡s de 10.000 clientes que ya reciben nuestras promociones"
                variant="banner"
              />
            </div>
          </Container>
        </section>

        {/* â”€â”€ SECTION: Contenido â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-contenido" className="py-16 border-b bg-muted/30">
          <Container>
            <SectionHeader title="Contenido" description="AboutSection, FAQAccordion, BlogCard, ContactForm" />

            <ComponentLabel>AboutSection</ComponentLabel>
            <div className="mb-8 border rounded-xl overflow-hidden">
              <AboutSection
                title="Nuestra historia"
                description="Somos una empresa familiar colombiana con mÃ¡s de 15 aÃ±os de experiencia ofreciendo productos de calidad. Creemos en el comercio justo y el apoyo a artesanos locales."
                image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop"
                values={[
                  { icon: "Heart", title: "PasiÃ³n", description: "Cada producto elegido con cuidado" },
                  { icon: "Shield", title: "Calidad", description: "GarantÃ­a en todos nuestros productos" },
                  { icon: "Truck", title: "Rapidez", description: "Entrega en todo Colombia" },
                ]}
              />
            </div>

            <ComponentLabel>FAQAccordion</ComponentLabel>
            <div className="mb-8 max-w-2xl">
              <FAQAccordion items={DEMO_FAQ} />
            </div>

            <ComponentLabel>BlogCard</ComponentLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <BlogCard
                  key={i}
                  title={`Tendencias de moda ${2026 - i}`}
                  excerpt="Descubrimos las principales tendencias que dominarÃ¡n el mercado este aÃ±o en Colombia y LatinoamÃ©rica."
                  image={`https://images.unsplash.com/photo-${1558618666 + i * 10000}-9ab2b58ced98?w=800&h=450&fit=crop`}
                  category="Moda"
                  date={`${i} de mayo, 2026`}
                  author={{ name: "Ana MartÃ­nez", avatar: "https://i.pravatar.cc/40?img=5" }}
                  href="#"
                  readTime={`${3 + i} min`}
                />
              ))}
            </div>

            <ComponentLabel>ContactForm</ComponentLabel>
            <div className="max-w-lg">
              <ContactForm onSubmit={(data) => console.log("Contact:", data)} />
            </div>
          </Container>
        </section>

        {/* â”€â”€ SECTION: Estados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-estados" className="py-16 border-b">
          <Container>
            <SectionHeader title="Estados" description="Loading, Empty, Error" />

            <ComponentLabel>LoadingGrid â€” skeleton</ComponentLabel>
            <div className="mb-8">
              <LoadingGrid count={3} columns={3} />
            </div>

            <ComponentLabel>EmptySearch</ComponentLabel>
            <div className="mb-8 border rounded-xl py-8">
              <EmptySearch query="vestido rojo" onReset={() => console.log("reset")} />
            </div>

            <ComponentLabel>ErrorState</ComponentLabel>
            <div className="border rounded-xl py-8">
              <ErrorState
                title="No pudimos cargar los productos"
                message="Revisa tu conexiÃ³n y volvÃ© a intentarlo."
                onRetry={() => console.log("retry")}
              />
            </div>
          </Container>
        </section>

        {/* â”€â”€ SECTION: Checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="section-checkout" className="py-16 border-b bg-muted/30">
          <Container>
            <SectionHeader title="Checkout" description="CheckoutSuccess confirmation screen" />

            <ComponentLabel>CheckoutSuccess</ComponentLabel>
            <div className="border rounded-xl overflow-hidden">
              <CheckoutSuccess
                orderNumber="GS-2026-00847"
                items={cartItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))}
                total={cartItems.reduce((s, i) => s + i.price * i.quantity, 0)}
                onContinueShopping={() => console.log("continue")}
              />
            </div>
          </Container>
        </section>

        {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Footer
          variant="minimal"
          storeName="GoShopping Design System"
          copyrightText="Design System Preview â€” Go Shopping 2026"
        />
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemove}
        onCheckout={() => { setCartOpen(false); console.log("checkout"); }}
      />
    </div>
  );
}

// â”€â”€ Helper components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-10">
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <Separator className="mt-4" />
    </div>
  );
}

function ComponentLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md inline-block mb-4">
      {String(children)}
    </p>
  );
}