# Catálogo de Templates

Cada tienda generada usa uno de estos 5 templates como punto de partida visual.

## minimal

**Estilo**: Limpio, blanco, mucho espacio en blanco, tipografía delicada  
**Ideal para**: Joyería fina, cosmética de lujo, arte, fotografía  
**Hero**: `HeroSimple` — imagen a full con texto superpuesto minimalista  
**Navbar**: `NavbarTransparent` — transparente con logo centered  
**Footer**: `FooterSimple` — solo links y copyright  
**Paleta base**: Blancos, negros, grises, con 1 color acento neutro  
**Tipografía**: Playfair Display + Inter  

```json
{
  "template": "minimal",
  "sections": ["hero", "featured_products", "newsletter"],
  "hero_variant": "simple",
  "navbar_variant": "transparent"
}
```

---

## vibrant

**Estilo**: Colorido, energético, bold, CTAs llamativos  
**Ideal para**: Moda juvenil, deportes, streetwear, accesorios  
**Hero**: `HeroSplit` — imagen 50/50 con texto bold y CTA grande  
**Navbar**: `NavbarSolid` — fondo de color primario  
**Footer**: `FooterFull` — con categorías, redes, newsletter  
**Paleta base**: Colores saturados, contrastes altos, acento neón  
**Tipografía**: Montserrat Bold + Roboto  

```json
{
  "template": "vibrant",
  "sections": ["promo_banner", "hero", "categories", "products", "testimonials", "newsletter"],
  "hero_variant": "split",
  "navbar_variant": "solid"
}
```

---

## elegant

**Estilo**: Sofisticado, oscuro, dorado/plateado, premium  
**Ideal para**: Relojes, alta costura, vinos finos, regalos de lujo  
**Hero**: `HeroVideo` — video de fondo o imagen de alta gama  
**Navbar**: `NavbarTransparent` — sobre imagen oscura  
**Footer**: `FooterDark` — fondo oscuro, links en dorado  
**Paleta base**: Negro, crema, dorado, burdeos  
**Tipografía**: Cormorant Garamond + Lato  

```json
{
  "template": "elegant",
  "sections": ["hero", "featured_products", "brand_story", "newsletter"],
  "hero_variant": "video",
  "navbar_variant": "transparent"
}
```

---

## urban

**Estilo**: Geométrico, bold, industrial, streetwear  
**Ideal para**: Skateboarding, tatuajes, música, cultura urbana  
**Hero**: `HeroFullscreen` — imagen fullscreen con tipografía bold sobre/debajo  
**Navbar**: `NavbarSolid` — fondo negro, letras blancas  
**Footer**: `FooterMinimal` — minimalista oscuro  
**Paleta base**: Negro, blanco, rojo/amarillo acento  
**Tipografía**: Bebas Neue + Space Grotesk  

```json
{
  "template": "urban",
  "sections": ["hero", "categories", "products", "testimonials"],
  "hero_variant": "fullscreen",
  "navbar_variant": "solid"
}
```

---

## fresh

**Estilo**: Natural, orgánico, verde, cercano, friendly  
**Ideal para**: Alimentos naturales, plantas, bienestar, productos eco  
**Hero**: `HeroWithFeatures` — imagen natural con features destacados debajo  
**Navbar**: `NavbarSolid` — fondo verde suave o blanco  
**Footer**: `FooterFull` — con valores de la marca, certificaciones  
**Paleta base**: Verdes, terracotas, cremas, marrones cálidos  
**Tipografía**: Nunito + Open Sans  

```json
{
  "template": "fresh",
  "sections": ["hero", "trust_badges", "products", "brand_story", "testimonials", "newsletter"],
  "hero_variant": "with_features",
  "navbar_variant": "solid"
}
```
