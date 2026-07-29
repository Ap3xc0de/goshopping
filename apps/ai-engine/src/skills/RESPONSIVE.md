# Skill: Responsive Design

## Breakpoints (Tailwind CSS)

| Prefijo | Min-width | Dispositivo |
|---------|-----------|-------------|
| (none) | 0px | Móvil (base) |
| `sm:` | 640px | Móvil grande |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop grande |
| `2xl:` | 1536px | Desktop XL |

## Principio Mobile-First

Escribir SIEMPRE para móvil primero, agregar breakpoints para pantallas más grandes:

```tsx
// CORRECTO — mobile first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// INCORRECTO — no hacer
<div className="grid grid-cols-4">  // sin adaptación móvil
```

## Adaptaciones por componente

### Navbar
```tsx
// Hamburger en móvil, links visibles en desktop
<Navbar
  variant="solid"
  // El componente maneja internamente la lógica responsive
/>
```

### Hero
```tsx
// HeroSplit: apilado en móvil, split en desktop
<HeroSplit
  // El componente adapta imagePosition automáticamente en móvil
/>
```

### ProductGrid
```tsx
<ProductGrid
  products={products}
  columns={3}   // 1 col móvil, 2 col tablet, 3 col desktop (manejado internamente)
/>
```

### Tipografía responsive
```tsx
// Reducir headings en móvil
<h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold">
  Título principal
</h1>

<p className="text-base lg:text-lg">
  Texto descriptivo
</p>
```

### Padding y spacing responsive
```tsx
<section className="py-8 md:py-12 lg:py-16 xl:py-20">
  <Container className="px-4 md:px-6 lg:px-8">
    {/* contenido */}
  </Container>
</section>
```

## Imágenes responsive

```tsx
<Image
  src={image}
  alt={alt}
  width={1200}
  height={600}
  className="w-full h-48 md:h-64 lg:h-80 object-cover"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

## Footer
```tsx
// 1 columna en móvil, multi-columna en desktop
<Footer variant="full" />
// El componente maneja el layout interno responsive
```

## Reglas de texto en móvil

- Nunca texto menor a `text-sm` (14px) en contenido principal
- Precio del producto: mínimo `text-base`
- Botón CTA: mínimo `text-sm font-semibold`, min-height 44px
