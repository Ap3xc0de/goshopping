# Skill: Layout y Estructura

## Reglas generales

- Toda tienda tiene: Navbar, contenido principal, Footer
- El Navbar SIEMPRE es el primer elemento visible
- El Footer SIEMPRE es el último
- Las secciones se separan con espaciado consistente (usar `--section-spacing`)
- Máximo 12 secciones en una HomePage (más es abrumador)
- Mínimo 4 secciones en una HomePage (menos se ve vacío)

## Estructura por tipo de negocio

### Moda / Ropa
1. Hero (split o slider con modelos/productos)
2. Categorías (Hombre, Mujer, Accesorios)
3. Productos destacados (grid 3-4 columnas)
4. Banner promocional
5. Nuevos ingresos
6. Testimonios
7. Newsletter
8. Footer

### Tecnología / Gadgets
1. Hero (slider con ofertas)
2. Categorías con iconos
3. Ofertas flash con countdown
4. Productos más vendidos
5. Trust badges (garantía, envío, soporte)
6. Comparativo de productos
7. Newsletter
8. Footer

### Alimentos / Bebidas
1. Hero (split con foto lifestyle)
2. Categorías visuales (fotos de comida)
3. Productos populares
4. Sobre nosotros (historia, valores)
5. Proceso (cómo funciona el envío)
6. Testimonios
7. FAQ
8. Footer

### Joyería / Lujo
1. Hero (centered, cinematográfico)
2. Colección destacada (grid 2 columnas, grande)
3. Historia de la marca
4. Artesanía / proceso
5. Testimonios selectos
6. Newsletter elegante
7. Footer

### General / Multiproducto
1. Hero (slider o centered)
2. Categorías
3. Productos destacados
4. Banner promocional
5. Productos más vendidos
6. Trust badges
7. Newsletter
8. Footer

## Reglas de secciones

- Cada sección usa un componente del design system — NO crear HTML custom
- Alternar secciones con y sin fondo (visual rhythm)
- CTAs claros en cada sección que lo requiera
- Las imágenes deben tener `aspect-ratio` definido (nunca stretch)
