# Skill: UX para E-commerce

## Principios fundamentales

1. **El CTA de compra debe ser visible sin scroll** (above the fold) — en hero y en producto
2. **Máximo 3 clicks** del catálogo al checkout completado
3. **Precio siempre visible** y formateado en moneda local (MXN, ARS, COP, etc.)
4. **Stock visible** — si queda poco, mostrar urgencia ("Solo quedan 3")
5. **Carrito accesible** desde cualquier página (CartDrawer o sidebar)
6. **Confirmación visual** al agregar al carrito (toast + badge actualizado en Navbar)
7. **Checkout simple** — máximo 3 secciones: datos personales, envío, pago

## Patrones de conversión (usar cuando aplique)

```tsx
// Trust badges cerca del botón de compra
<TrustBadges
  badges={[
    { icon: 'shield', label: 'Pago seguro' },
    { icon: 'truck', label: 'Envío en 48hs' },
    { icon: 'refresh', label: '30 días de devolución' },
  ]}
/>

// Testimonios cerca de productos
<TestimonialCards testimonials={testimonials} />

// Banner de envío gratis persistente
<PromoBanner
  message="🚚 Envío gratis en compras mayores a $500"
  dismissible={false}
  variant="primary"
/>

// Countdown para ofertas temporales
<CountdownTimer
  targetDate={offerEndDate}
  label="La oferta termina en:"
/>

// Stock bajo — urgencia
{product.stock > 0 && product.stock <= 5 && (
  <p className="text-orange-600 text-sm font-medium">
    ⚠️ Solo quedan {product.stock} unidades
  </p>
)}
```

## Formato de precios

```tsx
// Siempre formatear correctamente
const formatPrice = (amount: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

// En componentes:
<span className="text-2xl font-bold text-foreground">
  {formatPrice(product.price)}
</span>

// Precio tachado (cuando hay oferta):
<span className="text-lg line-through text-muted-foreground mr-2">
  {formatPrice(originalPrice)}
</span>
<span className="text-2xl font-bold text-accent">
  {formatPrice(salePrice)}
</span>
```

## Notificación al agregar al carrito

```tsx
// Usar con un sistema de toasts (el design system incluye Toast)
const handleAddToCart = (product: Product) => {
  addItem(product);
  // El CartDrawer y Navbar badge se actualizan automáticamente via useCart()
};
```

## Anti-patrones — NUNCA hacer

- ❌ Pop-ups que bloqueen la pantalla en los primeros 5 segundos
- ❌ Precios ocultos hasta el checkout (gas fees, envío sorpresa)
- ❌ Formularios de registro obligatorios antes de comprar (siempre guest checkout)
- ❌ Carrito que se vacía al navegar sin confirmación
- ❌ Páginas de producto sin al menos 1 imagen
- ❌ CTAs en colores que no contrasten (botones invisibles)
- ❌ Texto de producto truncado sin opción de ver más
- ❌ Sin feedback visual al completar acciones (agregar, eliminar, checkout)

## Flujo de checkout mínimo viable

```
1. Carrito → revisar items, cantidades, subtotal
2. Datos → nombre, email, teléfono, dirección de envío
3. Pago → método de pago, confirmar pedido
4. Confirmación → número de pedido, resumen, próximos pasos
```
