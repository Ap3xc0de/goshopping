---
sidebar_position: 4
---

# Sistema de Skills e Instrucciones

El AI Engine de GoShopping usa un sistema de **skills** y **documentos de contexto** para instruir a Claude API cómo generar tiendas correctamente. Este documento explica su arquitectura, contenido, y cómo extenderlo.

## ¿Qué son los Skills?

Los skills son archivos Markdown (`src/skills/*.md`) que encapsulan conocimiento de dominio específico. Son inyectados dinámicamente en el system prompt según el tipo de generación solicitada.

El AI no inventa estas reglas — las lee del Markdown antes de generar.

### Skills disponibles

| Archivo | Propósito |
|---------|-----------|
| `LAYOUT.md` | Orden de secciones por tipo de negocio |
| `DESIGN_SYSTEM.md` | Catálogo completo de 31 componentes |
| `COMPONENTS.md` | API de props de cada componente |
| `COLOR_ENGINE.md` | Sistema de paletas de 10 tokens por industria |
| `TYPOGRAPHY.md` | Pares de fuentes por estilo de tienda |
| `SEO.md` | Metadata obligatoria, Schema.org, URLs amigables |
| `ACCESSIBILITY.md` | WCAG 2.1 AA — contraste, ARIA, semántica |
| `RESPONSIVE.md` | Breakpoints, mobile-first, adaptaciones |
| `ECOMMERCE_UX.md` | Patrones de conversión, anti-patrones, UX |

## Documentos de contexto

Los **context docs** (`src/context/*.md`) proveen información sobre el sistema — no sobre reglas de diseño, sino sobre la plataforma en sí.

| Archivo | Propósito |
|---------|-----------|
| `SECURITY_RULES.md` | ⚠️ Qué NUNCA revelar ni generar (siempre primero) |
| `SDK_REFERENCE.md` | API completa del storefront-sdk |
| `API_REFERENCE.md` | Endpoints públicos del backend |
| `TEMPLATE_CATALOG.md` | 5 templates con su configuración visual |

## Selección dinámica de skills

`SystemPromptBuilder` selecciona qué skills inyectar según el tipo de solicitud:

```
requestType = 'store'
→ DESIGN_SYSTEM + COMPONENTS + RESPONSIVE + ACCESSIBILITY
  + LAYOUT + ECOMMERCE_UX + SEO + COLOR_ENGINE + TYPOGRAPHY

requestType = 'component'
→ DESIGN_SYSTEM + COMPONENTS + RESPONSIVE + ACCESSIBILITY
  + ECOMMERCE_UX

requestType = 'style'
→ COLOR_ENGINE + TYPOGRAPHY + DESIGN_SYSTEM
```

`SECURITY_RULES` siempre es el primer context doc, en todos los tipos.

## Diagrama de flujo

```
StoreConfig (nombre, categoría, estilo, template, colores)
    ↓
selectSkills(requestType)
    ↓
selectContextDocs(requestType)
    ↓
buildSystemPrompt(context) → System Prompt completo
    ↓
Claude API (system: prompt, user: instrucción específica)
    ↓
Guards de seguridad (output-sanitizer, code-validator, scope-guard)
    ↓
Código TSX generado y validado
```

## Prompt builders

| Archivo | Función exportada | Genera |
|---------|------------------|--------|
| `store-generator.ts` | `buildStoreGenerationPrompt(config)` | User prompt para HomePage completa |
| `component-generator.ts` | `buildComponentGenerationPrompt(config)` | User prompt para un componente específico |
| `style-generator.ts` | `buildStyleGenerationPrompt(config)` | User prompt para paleta CSS |

## Cómo agregar un nuevo skill

1. Crear el archivo en `apps/ai-engine/src/skills/NUEVO_SKILL.md`
2. Agregar el nombre al array correspondiente en `SystemPromptBuilder.selectSkills()`
3. Agregar el archivo al array `ALL_SKILLS` en `src/__tests__/skill-loader.test.ts`
4. Correr `npm test` en `apps/ai-engine/` y verificar que pase

### Estructura recomendada para un skill

```markdown
# Skill: Nombre del Skill

## Regla principal

[Explicación breve]

## Casos de uso

[Ejemplos concretos con código si aplica]

## Anti-patrones

[Qué NO hacer]
```

## Testing

Los tests del sistema de skills viven en `src/__tests__/`:

- `skill-loader.test.ts` — verifica existencia y contenido mínimo de todos los archivos
- `system-prompt.test.ts` — verifica que `SystemPromptBuilder` cargue, seleccione y ensamble correctamente
- `prompt-builder.test.ts` — verifica los prompt builders de generación

Para correr los tests:

```bash
cd apps/ai-engine
npm test
```
