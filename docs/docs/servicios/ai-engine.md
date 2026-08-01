---
sidebar_position: 3
title: AI Engine
---

# AI Engine

Servicio en el puerto **3002** que genera storefronts asistidos por IA para el flujo Admin “Crear tienda”.

:::warning Runtime real
El runtime productivo es **Node.js + TypeScript** (`apps/ai-engine/src/main.ts`). El binario Go en `cmd/server/` es un stub de health legacy. No hay consumer SQS/ElasticMQ.
:::

## Qué hace

1. Chat de onboarding (pasos fijos) → config de tienda
2. Claude (Anthropic) genera páginas TSX del storefront
3. Guards validan input/output/código
4. Persistencia en filesystem para preview/publish

## Documentación relacionada

| Doc | Contenido |
|-----|-----------|
| [Generador IA de Tiendas](../storefront/generador-ia.md) | Flujo de producto, skills, guards (guía operativa) |
| [AI Engine — Workflow Review](./ai-engine-workflow-review.md) | Discovery + hallazgos de diseño/comportamiento IA (2026-07-31) |

## Endpoints

| Method | Path | Notas |
|--------|------|-------|
| `GET` | `/health` | Health check |
| `POST` | `/chat/sessions` | Crear sesión de onboarding |
| `POST` | `/chat/sessions/:id/messages` | Mensaje del vendedor |
| `POST` | `/generate/store` | Generar páginas (JWT) |
| `POST` | `/generate/store/:slug/publish` | Publicar preview |
| `GET` | `/generate/store/:slug/status` | Estado |
| `DELETE` | `/generate/store/:slug` | Archivar |

Caller actual: panel Admin (`NEXT_PUBLIC_AI_ENGINE_URL`). **Core e Integrations no invocan este servicio.**
