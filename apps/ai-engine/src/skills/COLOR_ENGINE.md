# Skill: Motor de Colores

## Reglas para generar paletas

Dado 1-2 colores base del usuario, genera una paleta completa:

1. **primary** — el color principal (botones, CTAs, links activos)
2. **primary-foreground** — texto sobre primary (casi siempre blanco o negro)
3. **secondary** — color complementario (fondos secundarios, badges)
4. **secondary-foreground** — texto sobre secondary
5. **accent** — color de acento (alertas, ofertas, badges especiales)
6. **accent-foreground** — texto sobre accent
7. **background** — fondo general (blanco, crema, oscuro)
8. **foreground** — texto principal
9. **muted** — fondo de secciones alternas
10. **muted-foreground** — texto sobre muted

## Reglas de contraste WCAG AA

- Ratio mínimo para texto normal: **4.5:1**
- Ratio mínimo para texto grande (>18px): **3:1**
- `primary` sobre `primary-foreground` DEBE cumplir AA
- `foreground` sobre `background` DEBE cumplir AA
- Nunca usar amarillo puro (#FFFF00) sobre blanco — no cumple contraste

## Paletas por industria

| Industria | Base | Acento | Fondo |
|-----------|------|--------|-------|
| Moda / Ropa | Negro o blanco | Dorado o coral | Blanco o crema |
| Tecnología | Azul eléctrico | Cian o verde | Gris oscuro |
| Alimentos | Verde oliva | Coral o naranja | Crema |
| Joyería / Lujo | Negro o crema | Dorado o bronce | Crema o negro |
| Infantil | Pastel suave | Primario vibrante | Blanco |
| Deportes | Rojo o azul | Naranja o amarillo | Negro o gris |
| Salud / Bienestar | Verde menta | Lavanda | Blanco puro |

## Formato de salida

**SIEMPRE en formato HSL para CSS variables, solo los valores numéricos:**

```css
--primary: 142 71% 45%;
--primary-foreground: 0 0% 100%;
--secondary: 210 40% 96%;
--secondary-foreground: 222 47% 11%;
--accent: 16 84% 55%;
--accent-foreground: 0 0% 100%;
--background: 0 0% 100%;
--foreground: 222 47% 11%;
--muted: 210 40% 96%;
--muted-foreground: 215 16% 47%;
```

**NO** usar `hsl(...)` — solo los valores separados por espacios.

## Proceso de generación

1. Recibir color base del usuario (hex o descripción)
2. Convertir a HSL
3. Generar los 10 tokens derivados
4. Verificar contraste mínimo AA
5. Si no cumple, ajustar lightness ±10% hasta cumplir
6. Generar también dark mode si se solicita

## Aplicación en CSS

Los tokens se mapean en el design system como variables CSS:

```css
/* En el archivo globals.css de la tienda */
:root {
  --primary: 142 71% 45%;
  --brand-primary: hsl(var(--primary));
  /* ... */
}
```

En componentes usar SIEMPRE `var(--brand-primary)`, nunca hex directo.
