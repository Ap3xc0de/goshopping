# Skill: Tipografía

## Pares de fuentes por estilo

| Estilo de tienda | Heading | Body | Carácter |
|------------------|---------|------|----------|
| minimal | Playfair Display | Inter | Elegante, atemporal |
| elegant | Cormorant Garamond | Lato | Lujoso, sofisticado |
| vibrant | Montserrat Bold | Roboto | Energético, moderno |
| urban | Bebas Neue | Space Grotesk | Bold, impactante |
| fresh | Nunito | Open Sans | Amigable, cercano |

## Cómo cargar fuentes (Next.js)

**SIEMPRE usar `next/font/google`, NUNCA `@import` en CSS:**

```tsx
// app/layout.tsx
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

## Escala tipográfica

```css
--text-xs:   0.75rem;    /* 12px — labels, badges */
--text-sm:   0.875rem;   /* 14px — body small */
--text-base: 1rem;       /* 16px — body default */
--text-lg:   1.125rem;   /* 18px — body large */
--text-xl:   1.25rem;    /* 20px — subtitle */
--text-2xl:  1.5rem;     /* 24px — heading small */
--text-3xl:  1.875rem;   /* 30px — heading medium */
--text-4xl:  2.25rem;    /* 36px — heading large */
--text-5xl:  3rem;       /* 48px — hero */
--text-6xl:  3.75rem;    /* 60px — hero XL */
```

## Reglas de uso

- **Headings**: fuente de display (Playfair, Cormorant, Bebas, etc.)
- **Body**: fuente sans-serif legible (Inter, Roboto, Open Sans)
- **Precios**: font-weight 700, tamaño destacado
- **Botones**: font-weight 600, letter-spacing leve
- En **móvil** reducir los headings 1-2 niveles (h1 hero: 3xl en móvil, 5xl en desktop)
- Line-height para body: 1.6 — para headings: 1.1-1.2
- Letter-spacing para headings uppercase: 0.05em

## Variables CSS en la tienda

```css
:root {
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
}

h1, h2, h3 { font-family: var(--font-heading); }
body { font-family: var(--font-body); }
```
