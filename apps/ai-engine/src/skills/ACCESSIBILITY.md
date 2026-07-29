# Skill: Accesibilidad WCAG 2.1 AA

## Contraste de color

- Texto normal (< 18px / < 14px bold): ratio mínimo **4.5:1**
- Texto grande (≥ 18px / ≥ 14px bold): ratio mínimo **3:1**
- Componentes UI e iconos informativos: ratio mínimo **3:1**

## Imágenes

```tsx
// Descriptivo — NO usar "imagen", "foto", ni dejar vacío
<Image src={hero} alt="Modelo usando chaqueta de cuero negra" />
<Image src={logo} alt="Logo de Mi Tienda" />

// Decorativas — alt vacío explícito
<Image src={decoration} alt="" aria-hidden="true" />
```

## Formularios

```tsx
// SIEMPRE label asociado — NUNCA solo placeholder
<div>
  <label htmlFor="email" className="block text-sm font-medium">
    Correo electrónico
  </label>
  <input
    id="email"
    type="email"
    name="email"
    required
    aria-describedby="email-error"
    className="..."
  />
  <p id="email-error" role="alert" className="text-red-600 text-sm hidden">
    Por favor ingresa un correo válido
  </p>
</div>
```

## Focus visible

```tsx
// Usar clases de Tailwind — NUNCA quitar outline sin reemplazar
className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
```

## Semántica HTML

```tsx
// Estructura semántica obligatoria
<header>
  <Navbar ... />
</header>
<main id="main-content">
  {/* secciones principales */}
</main>
<footer>
  <Footer ... />
</footer>
```

## Skip to content

```tsx
// Primer elemento del <body> — para usuarios de teclado
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
             z-50 bg-primary text-primary-foreground px-4 py-2 rounded"
>
  Saltar al contenido principal
</a>
```

## Botones icon-only

```tsx
// Siempre aria-label en botones sin texto visible
<button aria-label="Abrir carrito de compras">
  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
</button>
```

## Tap targets (móvil)

- Tamaño mínimo: **44×44px** para cualquier elemento interactivo
- Uso de `min-h-[44px] min-w-[44px]` o `p-3` en botones pequeños

## ARIA roles comunes

```tsx
// Alertas y notificaciones
<div role="alert" aria-live="assertive">Item agregado al carrito</div>

// Región de navegación adicional
<nav aria-label="Navegación de categorías">...</nav>

// Cargando
<div aria-busy={loading} aria-live="polite">
  {loading ? 'Cargando productos...' : null}
</div>
```
