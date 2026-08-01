---
sidebar_position: 3.1
title: AI Engine — Workflow Review
---

# AI Engine — Workflow Review

**Fecha:** 2026-07-31  
**Alcance:** Diseño y comportamiento del sistema de IA en `apps/ai-engine` (no auditoría general de seguridad/código).  
**Relacionado:** [AI Engine](./ai-engine.md) · [Generador IA de Tiendas](../storefront/generador-ia.md)

:::info
Este documento refleja lo que el código hace **hoy**. Afirmaciones de arquitectura (Go + SQS + pricing/recs) que contradicen el código se marcan como drift.
:::

---

## 1. Discovery summary

### Propósito real (confirmado)

El AI Engine es un **generador de storefronts** asistido por IA para el flujo Admin “Crear tienda”:

1. Chat de onboarding en español (pasos fijos) — `ChatService` + `/chat/*`
2. Claude extrae **categoría** de negocio y **colores** de marca
3. Generación secuencial de páginas TSX (Home / Catalog / Product / Checkout + opcionales)
4. Ensamblado y persistencia en disco (`STORES_PATH`) → preview / publish

### Matriz de candidatos

| Capacidad | Estado | Evidencia |
|-----------|--------|-----------|
| Generación de storefront (chat + páginas) | **Confirmado** | Única ruta de producto viva |
| Clasificación de categoría de negocio | **Confirmado** | Paso de chat vía Claude |
| Descripciones de producto | **Refutado** | Sin rutas/prompts |
| Auto-respuestas WhatsApp / soporte | **Refutado** | Dominio de Integrations/Core |
| Forecasting de demanda | **Refutado** | Sin código |
| Sugerencias de precio / descuento | **Refutado** | Solo en docs aspiracionales |
| Fraude / anomalías | **Refutado** | Sin código |
| Copy de ads (Meta/Google) | **Refutado** | Sin código |
| Summarization de analytics | **Refutado** | Sin código |
| Search / product recommendations | **Refutado** | Solo heurísticas de estilo |

### Provider y invocación

| Ítem | Valor |
|------|--------|
| Provider | Anthropic únicamente |
| SDK | `@anthropic-ai/sdk` |
| Cliente | `src/services/claude-client.ts` |
| Modelo default | `claude-sonnet-4-20250514` (`ANTHROPIC_MODEL`) |
| Invocación | Sync `messages.create` — sin cola, sin embeddings, sin ML clásico |

### Flujo de request

```
Admin (browser) ChatAssistant
  → HTTP sync → AI Engine :3002  (/chat/*, /generate/store)
  → Anthropic Claude
  → Filesystem STORES_PATH (páginas Next.js por slug)
```

- **Caller real:** `apps/admin` vía `NEXT_PUBLIC_AI_ENGINE_URL`
- **No llaman al AI Engine:** `core`, `integrations`, `storefront`, `superadmin`
- **Cola ElasticMQ/SQS:** diagramas la muestran; **no hay consumer** en el código

### Runtime vs docs

| Claim en docs | Realidad |
|---------------|----------|
| AI Engine en Go | Runtime productivo = **Node/TypeScript**; `cmd/server/main.go` es stub de health |
| Consume eventos SQS | **No implementado** |
| Pricing / recommendations | **No implementado** |

### Estado / multi-tenant en llamadas IA

| Concern | Comportamiento actual |
|---------|------------------------|
| Sesiones de chat | `Map` in-memory — se pierden al reiniciar |
| `storeId` en sesión | Se guarda al crear; **no se revalida** en mensajes |
| Auth `/chat` | **Ninguna** |
| Auth `/generate` | JWT Bearer; `payload.storeId` se adjunta pero **no se compara** con `body.store_id` / slug |
| Persistencia | Por **slug** en filesystem, no aislamiento por UUID de tienda |
| Admin create-store | `storeId = 'new-store'` hardcodeado |

---

## 2. Findings

### [IMPACT: High] Page generation prompt always asks for HomePage

- **Where:** `apps/ai-engine/src/prompts/store-generator.ts` + `services/generation-pipeline.ts`
- **Current behavior:** Cada iteración del loop construye el mismo user prompt (“Genera … **HomePage**”) y luego añade `Genera el componente: CatalogPage` (etc.).
- **Concern:** El modelo recibe la tarea incorrecta; Catalog/Product/Checkout quedan estructuralmente rotos.
- **Recommendation:** Parametrizar `buildStoreGenerationPrompt(pageName)`; validar que el output corresponda a la página pedida antes de ensamblar.

### [IMPACT: High] JWT storeId not bound to body / slug

- **Where:** `apps/ai-engine/src/routes/generate.ts` (`requireAuth`)
- **Current behavior:** Verifica Bearer JWT y adjunta `storeId`, pero nunca lo compara con `body.store_id` ni con `:storeSlug`. Publish/archive solo por slug.
- **Concern:** Un tenant puede sobrescribir/publicar el slug de otro si lo conoce.
- **Recommendation:** Exigir `token.storeId === body.store_id`; autorizar ownership del slug antes de write/publish.

### [IMPACT: High] Generate auth secret exposed to the browser

- **Where:** `apps/admin/src/components/store-builder/ChatAssistant.tsx` — `NEXT_PUBLIC_ADMIN_TOKEN`
- **Current behavior:** El header `Authorization` usa un secret `NEXT_PUBLIC_*`.
- **Concern:** Quien tenga el bundle de Admin puede llamar `/generate` y gastar cuota Anthropic / escribir stores.
- **Recommendation:** Proxificar generate/publish por el server de Admin (o Core) con secret server-only; eliminar el token público.

### [IMPACT: High] Chat API is unauthenticated

- **Where:** `apps/ai-engine/src/routes/chat.ts`
- **Current behavior:** Cualquiera que alcance `:3002` puede crear sesiones y disparar Claude en pasos de categoría/colores.
- **Concern:** Abuso de costo y sin binding de tenant en el gasto de chat.
- **Recommendation:** Misma auth que generate; rate-limit por usuario/tenant, no solo por IP.

### [IMPACT: Medium] Sonnet for trivial field extraction

- **Where:** `chat-service.extractFieldValue` (category, colors)
- **Current behavior:** Sonnet default para clasificar una categoría y parsear JSON de colores; style/pages usan reglas.
- **Concern:** Modelo caro para NLP trivial.
- **Recommendation:** Haiku (o heurísticas) para extract; reservar Sonnet para codegen de páginas.

### [IMPACT: Medium] No timeout, retry, or backoff on Claude

- **Where:** `apps/ai-engine/src/services/claude-client.ts`
- **Current behavior:** `messages.create` sin AbortSignal/timeout/retry.
- **Concern:** Un hang de Anthropic bloquea el UX de generate en Admin (no checkout, pero sí mala experiencia).
- **Recommendation:** Timeout duro (~60–90s/página), retries limitados en 429/5xx, fallar la página de forma ruidosa.

### [IMPACT: Medium] Silent wrong defaults on extract failure

- **Where:** `chat-service.ts` — catch → `'general'` / HSL default
- **Current behavior:** Fallos de Claude/JSON se ven como respuestas válidas.
- **Concern:** El merchant avanza con categoría/colores incorrectos.
- **Recommendation:** Responder “no pude interpretar…” y re-preguntar; no inventar colores de marca.

### [IMPACT: Medium] Free-text JSON parsing for colors

- **Where:** rama `colors` en `extractFieldValue`
- **Current behavior:** Regex `\{...\}` + `JSON.parse`; sin tool_use / schema.
- **Concern:** Parsing frágil; fuente típica de fallos silenciosos.
- **Recommendation:** Structured output / tools de Anthropic o validación Zod; rechazar HSL inválido.

### [IMPACT: Medium] validateScope never runs in generation

- **Where:** `guards/scope-guard.ts` (testeado) vs `generation-pipeline.ts`
- **Current behavior:** El pipeline solo corre input/output/code guards.
- **Concern:** Checks de “no backend code” no protegen stores generados.
- **Recommendation:** Llamar `validateScope(..., 'page')` tras codegen; bloquear la página si falla.

### [IMPACT: Medium] Full skills+context re-sent per page; no usage tracking

- **Where:** loop en `generation-pipeline.ts`; `claude-client.ts`
- **Current behavior:** El mismo system prompt grande se envía N veces; `response.usage` se ignora.
- **Concern:** Costo de tokens innecesario; sin visibilidad de spend por tenant.
- **Recommendation:** Construir system prompt una vez; loguear tokens + `store_id`; considerar prompt cache.

### [IMPACT: Medium] Untrusted merchant text interpolated into prompts

- **Where:** prompts de extract en chat; bloque `storeConfig` en `system-prompt.ts` (name/tagline)
- **Current behavior:** Strings del usuario entran al prompt; el guard de injection mitiga en el path de chat.
- **Concern:** Superficie clásica de prompt injection hacia codegen (skills, UI maliciosa). Guards mitigan; no son herméticos.
- **Recommendation:** Tratar name/tagline como datos no confiables (delimitadores); nunca elevarlos a instrucciones; mantener code validator obligatorio.

### [IMPACT: Low] Architecture docs vs reality

- **Where:** `cmd/server/main.go`; docs de capas/visión con SQS AI / pricing / Go
- **Current behavior:** Mapa aspiracional del producto.
- **Concern:** Desorienta planning y ops.
- **Recommendation:** Documentar “storefront codegen, Node, Admin sync only” o eliminar el stub Go.

### [IMPACT: Low] No prompt/model versioning or live eval harness

- **Where:** `prompts/`, `skills/`, `__tests__/` (Claude mockeado)
- **Current behavior:** Unit tests de guards/pipeline con mocks; sin golden storefronts ni LLM-as-judge.
- **Concern:** Regresiones de prompt solo se detectan a mano en Admin.
- **Recommendation:** Snapshot de 3–5 configs fixture → assert nombres de página, patrones bloqueados, imports del SDK; pin de versión de prompt en meta.

---

## 3. Failure modes vs business impact

| Fallo | Impacto de negocio |
|-------|-------------------|
| AI Engine caído | Solo rompe “Crear tienda con IA” |
| Anthropic down / bad key | Chat avanza en pasos sin LLM; extract degrada a defaults; generate 500/207 |
| Generación parcial | Store incompleto en preview; usuario puede regenerar |
| Restart del proceso | Sesión de chat perdida |
| Outage de AI en DIAN / inventory / checkout | **No aplica** — Core no depende del AI Engine |

---

## 4. Top 3 improvement opportunities

| Rank | Oportunidad | Valor esperado | Esfuerzo |
|------|-------------|----------------|----------|
| 1 | **Fix generation correctness** — prompts por página, timeouts, wire `validateScope`, extract estructurado con re-ask | Reliability | S |
| 2 | **Close tenant + auth gaps** — proxy server-side, bind JWT↔store_id/slug, auth en `/chat`, sin secrets `NEXT_PUBLIC_*` | Business risk / abuso de costo | M |
| 3 | **Cut cost & add metering** — Haiku para extract, system prompt una vez, log `usage` por tenant | Cost | S–M |

---

## 5. Inventario de rutas (referencia)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |
| POST | `/chat/sessions` | No |
| POST | `/chat/sessions/:sessionId/messages` | No |
| GET | `/chat/sessions/:sessionId` | No |
| POST | `/generate/store` | JWT |
| POST | `/generate/store/:storeSlug/publish` | JWT |
| GET | `/generate/store/:storeSlug/status` | JWT |
| DELETE | `/generate/store/:storeSlug` | JWT |

**No cableado aún (código existe):** `buildComponentGenerationPrompt`, `buildStyleGenerationPrompt`, `ClaudeClient.chat()`, `TemplateResolver`, `GuardPipeline.validateScope()` dentro del pipeline de generate.
