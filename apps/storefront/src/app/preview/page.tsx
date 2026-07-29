import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";
import { templateList } from "@/templates";
import { buildTemplateCSSVars } from "@/lib/template-css";

// -- Template card color swatch -----------------------------------------

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-white/20 shadow-sm flex-shrink-0"
      style={{ backgroundColor: `hsl(${color})` }}
      aria-hidden
    />
  );
}

// -- Template card ------------------------------------------------------

function TemplateCard({
  id,
  name,
  description,
  category,
  colors,
  fonts,
  style,
  components,
}: (typeof templateList)[number]) {
  const cssVars = buildTemplateCSSVars({
    id,
    name,
    description,
    category,
    colors,
    fonts,
    style,
    components,
    homeSections: [],
  });

  return (
    <Link
      href={`/preview/${id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Mini color preview bar */}
      <div
        className="h-2 w-full flex-shrink-0"
        style={{
          background: `linear-gradient(90deg, hsl(${colors.primary}) 0%, hsl(${colors.accent}) 60%, hsl(${colors.secondary}) 100%)`,
        }}
      />

      {/* Card body */}
      <div className="flex flex-col gap-4 p-6 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Industries */}
        <div className="flex flex-wrap gap-1.5">
          {category.slice(0, 4).map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {cat}
            </span>
          ))}
          {category.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              +{category.length - 4}
            </span>
          )}
        </div>

        {/* Config summary */}
        <div className="mt-auto pt-4 border-t flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium text-foreground mr-1">Colores:</span>
            <span className="flex items-center gap-1">
              <ColorSwatch color={colors.primary} />
              <ColorSwatch color={colors.accent} />
              <ColorSwatch color={colors.secondary} />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>
              <span className="font-medium text-foreground">Tipografía:</span>{" "}
              {fonts.heading}
            </span>
            <span>
              <span className="font-medium text-foreground">Hero:</span>{" "}
              {components.hero}
            </span>
            <span>
              <span className="font-medium text-foreground">Navbar:</span>{" "}
              {components.navbar}
            </span>
            <span>
              <span className="font-medium text-foreground">Estilo:</span>{" "}
              {style.borderRadius} / {style.shadows}
            </span>
          </div>
        </div>
      </div>

      {/* Hover overlay CTA */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={cssVars as React.CSSProperties}
      >
        <span
          className="px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg"
          style={{
            backgroundColor: `hsl(${colors.primary})`,
            color: `hsl(${colors.primaryForeground})`,
          }}
        >
          Ver preview &rarr;
        </span>
      </div>
    </Link>
  );
}

// -- Page ---------------------------------------------------------------

export default function TemplateIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-sm font-medium text-primary mb-2">
            Elige tu estilo
          </p>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Templates de tienda
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Cada template define la personalidad visual de tu tienda: colores,
            tipografía, estructura y componentes. La IA lo personaliza con tu
            marca y productos.
          </p>
        </div>
      </div>

      {/* Template grid */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templateList.map((template) => (
            <TemplateCard key={template.id} {...template} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            Ver todos los componentes del Design System:{" "}
            <Link
              href="/design-system"
              className="text-primary hover:underline font-medium"
            >
              Design System Gallery
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}