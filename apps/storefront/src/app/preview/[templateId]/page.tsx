"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getTemplate, templateList } from "@/templates";
import { buildTemplateCSSVars } from "@/lib/template-css";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroCentered } from "@/components/hero/HeroCentered";
import { HeroSplit } from "@/components/hero/HeroSplit";
import { HeroSlider } from "@/components/hero/HeroSlider";
import { HeroMinimal } from "@/components/hero/HeroMinimal";
import { ProductGrid } from "@/components/product/ProductGrid";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { CountdownTimer } from "@/components/marketing/CountdownTimer";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { TestimonialCards } from "@/components/marketing/TestimonialCards";
import { TrustBadges } from "@/components/marketing/TrustBadges";
import { CategoryShowcase } from "@/components/marketing/CategoryShowcase";
import { AboutSection } from "@/components/content/AboutSection";
import { FAQAccordion } from "@/components/content/FAQAccordion";
import { ContactForm } from "@/components/content/ContactForm";

// ── Mock data ─────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Camiseta Premium",
    price: 89000,
    originalPrice: 120000,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop",
    badge: "OFERTA",
    rating: 4.5,
    reviewCount: 128,
    href: "#",
  },
  {
    id: "2",
    name: "Zapatos Deportivos",
    price: 245000,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop",
    badge: "NUEVO",
    rating: 4.8,
    reviewCount: 54,
    href: "#",
  },
  {
    id: "3",
    name: "Bolso Cuero Artesanal",
    price: 380000,
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=500&fit=crop",
    rating: 4.2,
    reviewCount: 37,
    href: "#",
  },
  {
    id: "4",
    name: "Reloj Minimalista",
    price: 195000,
    originalPrice: 220000,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop",
    rating: 4.7,
    reviewCount: 93,
    href: "#",
  },
  {
    id: "5",
    name: "Lentes de Sol",
    price: 75000,
    image:
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&fit=crop",
    rating: 4.1,
    reviewCount: 21,
    href: "#",
  },
  {
    id: "6",
    name: "Gorra Streetwear",
    price: 45000,
    image:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=500&fit=crop",
    badge: "NUEVO",
    rating: 4.0,
    reviewCount: 15,
    href: "#",
  },
  {
    id: "7",
    name: "Mochila Urban",
    price: 165000,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=500&fit=crop",
    rating: 4.6,
    reviewCount: 72,
    href: "#",
  },
  {
    id: "8",
    name: "Cinturón Cuero",
    price: 55000,
    image:
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=500&fit=crop",
    rating: 4.3,
    reviewCount: 41,
    href: "#",
  },
];

const MOCK_CATEGORIES = [
  {
    name: "Ropa",
    image:
      "https://images.unsplash.com/photo-1467043198406-dc953a3defa0?w=400&h=400&fit=crop",
    href: "#",
    productCount: 148,
  },
  {
    name: "Zapatos",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
    href: "#",
    productCount: 73,
  },
  {
    name: "Accesorios",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    href: "#",
    productCount: 95,
  },
  {
    name: "Bolsos",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",
    href: "#",
    productCount: 62,
  },
];

const MOCK_TESTIMONIALS = [
  {
    name: "María García",
    text: "Excelente calidad y llegó súper rápido. Definitivamente volvería a comprar aquí.",
    rating: 5,
    role: "Cliente frecuente",
    avatar: "https://i.pravatar.cc/100?img=1",
  },
  {
    name: "Carlos Rodríguez",
    text: "Los productos son tal como se muestran en las fotos. Muy satisfecho.",
    rating: 4,
    role: "Cliente verificado",
    avatar: "https://i.pravatar.cc/100?img=3",
  },
  {
    name: "Ana Martínez",
    text: "Atención al cliente de primera. Me ayudaron con mi pedido de inmediato.",
    rating: 5,
    role: "Cliente verificada",
    avatar: "https://i.pravatar.cc/100?img=5",
  },
];

const MOCK_FAQ = [
  {
    question: "¿Cuánto tarda el envío?",
    answer:
      "Los pedidos se despachan en 24 horas hábiles. Entrega en 2-5 días en ciudades principales.",
  },
  {
    question: "¿Puedo devolver un producto?",
    answer:
      "Sí. Tienes 30 días desde la fecha de compra para solicitar una devolución o cambio.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Tarjetas de crédito/débito (Visa, Mastercard), PSE, y pago contra entrega.",
  },
];

const SLIDER_SLIDES = [
  {
    title: "Nueva Colección 2026",
    subtitle: "Los mejores productos al mejor precio",
    ctaLabel: "Ver ofertas",
    ctaHref: "#",
    backgroundImage:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop",
  },
  {
    title: "Flash Sale — 50% OFF",
    subtitle: "Solo por las próximas 24 horas",
    ctaLabel: "Comprar ahora",
    ctaHref: "#",
    backgroundImage:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&h=900&fit=crop",
  },
  {
    title: "Envío Gratis",
    subtitle: "En todos los pedidos mayores a $100.000",
    ctaLabel: "Explorar catálogo",
    ctaHref: "#",
    backgroundImage:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&h=900&fit=crop",
  },
];

const NAV_LINKS = [
  { label: "Tienda", href: "#" },
  { label: "Categorías", href: "#" },
  { label: "Ofertas", href: "#" },
  { label: "Nosotros", href: "#" },
];

// ── Countdown target: 48 h from now ──────────────────────────────────────
const COUNTDOWN_TARGET = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

// ── Section renderer ──────────────────────────────────────────────────────

function renderSection(
  section: string,
  index: number,
  storeName: string,
) {
  const key = `${section}-${index}`;

  switch (section) {
    case "PromoBanner":
      return (
        <PromoBanner
          key={key}
          message="¡ENVÍO GRATIS en pedidos mayores a $100.000!"
          ctaLabel="Ver condiciones"
          ctaHref="#"
          dismissible
        />
      );

    case "HeroSlider":
      return <HeroSlider key={key} slides={SLIDER_SLIDES} autoPlayInterval={5000} />;

    case "HeroCentered":
      return (
        <HeroCentered
          key={key}
          title={storeName}
          subtitle="Colección exclusiva — calidad y elegancia en cada pieza"
          ctaLabel="Explorar colección"
          ctaHref="#"
          ctaSecondaryLabel="Sobre nosotros"
          ctaSecondaryHref="#"
          backgroundImage="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop"
          overlayOpacity={0.45}
        />
      );

    case "HeroSplit":
      return (
        <HeroSplit
          key={key}
          title={storeName}
          description="Cada producto es seleccionado con cuidado para ofrecerte la mejor calidad."
          ctaLabel="Explorar colección"
          ctaHref="#"
          ctaSecondaryLabel="Conocer más"
          ctaSecondaryHref="#"
          image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop"
        />
      );

    case "HeroMinimal":
      return (
        <HeroMinimal
          key={key}
          title={storeName}
          subtitle="Lo mejor para los que exigen más."
          ctaLabel="Ver colección"
          ctaHref="#"
        />
      );

    case "CategoryShowcase":
      return (
        <CategoryShowcase
          key={key}
          categories={MOCK_CATEGORIES}
          columns={3}
        />
      );

    case "ProductGrid":
      // First ProductGrid = "Destacados", second = "Recién llegados"
      return (
        <ProductGrid
          key={key}
          products={MOCK_PRODUCTS.slice(0, 4)}
          columns={4}
          title={index < 4 ? "Productos destacados" : "Recién llegados"}
        />
      );

    case "AboutSection":
      return (
        <AboutSection
          key={key}
          title="Nuestra historia"
          description={`${storeName} nació con la misión de acercar productos de calidad a cada rincón del país. Trabajamos directamente con fabricantes y artesanos para ofrecerte lo mejor.`}
          image="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=600&fit=crop"
          imagePosition="right"
          values={[
            { icon: "check", title: "Calidad garantizada", description: "Cada producto pasa por control de calidad." },
            { icon: "truck", title: "Envío rápido", description: "Despacho en 24 horas hábiles." },
            { icon: "shield", title: "Compra segura", description: "Pagos encriptados y protegidos." },
          ]}
        />
      );

    case "CountdownTimer":
      return (
        <CountdownTimer
          key={key}
          targetDate={COUNTDOWN_TARGET}
          title="¡Oferta especial por tiempo limitado!"
        />
      );

    case "TrustBadges":
      return <TrustBadges key={key} />;

    case "TestimonialCards":
      return (
        <TestimonialCards
          key={key}
          testimonials={MOCK_TESTIMONIALS}
          autoPlay
          interval={4000}
        />
      );

    case "NewsletterSignup":
      return (
        <NewsletterSignup
          key={key}
          title="Suscríbete y recibe un 10% de descuento"
          description="Entérate primero de nuevas colecciones y ofertas exclusivas."
        />
      );

    case "FAQAccordion":
      return <FAQAccordion key={key} items={MOCK_FAQ} />;

    case "ContactForm":
      return <ContactForm key={key} />;

    default:
      return null;
  }
}

// ── Template selector floating UI ────────────────────────────────────────

function TemplateSwitcher({ currentId }: { currentId: string }) {
  const router = useRouter();
  return (
    <div className="fixed bottom-4 right-4 z-[200] bg-white rounded-xl shadow-2xl border p-4 w-60">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Cambiar template
      </p>
      <div className="flex flex-col gap-1.5">
        {templateList.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(`/preview/${t.id}`)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentId === t.id
                ? "bg-black text-white font-medium"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {t.name}
            <span className="block text-xs opacity-60 font-normal truncate">
              {t.category.slice(0, 2).join(", ")}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t">
        <Link
          href="/preview"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Todos los templates
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TemplatePreviewPage() {
  const params = useParams();
  const templateId = params?.templateId as string;
  const wrapperRef = useRef<HTMLDivElement>(null);

  let template;
  try {
    template = getTemplate(templateId);
  } catch {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium">Template &quot;{templateId}&quot; no encontrado.</p>
        <Link href="/preview" className="text-sm text-primary underline">
          Ver todos los templates
        </Link>
      </div>
    );
  }

  // Apply template CSS vars to the wrapper div (not document root)
  // This scopes the preview without leaking styles to the selector UI.
  const cssVars = buildTemplateCSSVars(template);

  const storeName = "MiTienda";

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-[200] bg-white border-b flex items-center gap-3 px-4 py-2 text-sm shadow-sm">
        <Link
          href="/preview"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Templates
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">{template.name}</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {template.description}
          </span>
          <a
            href="#"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Usar este template
          </a>
        </span>
      </div>

      {/* Template preview wrapper — all CSS vars scoped here */}
      <div
        ref={wrapperRef}
        style={cssVars as React.CSSProperties}
        className="pt-10"
      >
        {/* Background and foreground from template */}
        <div
          style={{
            backgroundColor: `hsl(${template.colors.background})`,
            color: `hsl(${template.colors.foreground})`,
            minHeight: "100vh",
          }}
        >
          <Navbar
            variant={template.components.navbar}
            logo={{ text: storeName, href: "#" }}
            links={NAV_LINKS}
            cartCount={2}
            onCartClick={() => {}}
          />

          <main>
            {template.homeSections.map((section, i) =>
              renderSection(section, i, storeName),
            )}
          </main>

          <Footer
            variant={template.components.footer}
            storeName={storeName}
            tagline="Tu tienda favorita en Colombia"
            sections={[
              {
                title: "Empresa",
                links: [
                  { label: "Sobre nosotros", href: "#" },
                  { label: "Blog", href: "#" },
                ],
              },
              {
                title: "Soporte",
                links: [
                  { label: "FAQ", href: "#" },
                  { label: "Contacto", href: "#" },
                ],
              },
            ]}
            social={[
              { platform: "instagram", href: "#" },
              { platform: "facebook", href: "#" },
              { platform: "tiktok", href: "#" },
            ]}
            newsletterEnabled={false}
          />
        </div>
      </div>

      <TemplateSwitcher currentId={templateId} />
    </>
  );
}
