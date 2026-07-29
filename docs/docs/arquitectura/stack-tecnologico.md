---
sidebar_position: 4
---

# Stack Tecnológico

## Resumen por componente

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Core API | Go + Fiber | Go 1.22, Fiber v2.52 | Rendimiento, concurrencia nativa, binarios pequeños |
| DB Driver | pgx/v5 | 5.5.5 | Driver nativo PostgreSQL, sin ORM |
| Migrations | golang-migrate | 4.x | Simple, SQL puro, sin magia |
| Auth | JWT (golang-jwt) | v5 | HMAC-SHA256, claims tipados |
| Passwords | bcrypt | stdlib | Estándar de la industria |
| Integrations | NestJS | 10.x | SDKs npm de Wompi/Siigo/Meta, DI nativo |
| Frontends | Next.js + Tailwind | 14.x / 3.x | App Router, SSR, RSC |
| Shared Types | TypeScript | 5.x | Tipado compartido entre frontends |
| Database | PostgreSQL | 16 | JSONB, UUID, TIMESTAMPTZ, extensiones |
| Cache | Redis | 7 | Sessions, rate limiting (Etapa 2+) |
| Event Bus | AWS SQS / ElasticMQ | - | DLQ nativa, serverless, pay-per-use |
| Storage | AWS S3 / LocalStack | - | Assets: imágenes de productos |
| Infra | Terraform | 1.5+ | IaC, módulos reutilizables |
| Containers | AWS ECS Fargate | - | Serverless containers, sin gestión de EC2 |
| Registry | AWS ECR | - | Docker registry privado en AWS |
| CDN | CloudFront | - | Assets + Storefront |
| Secrets | AWS Secrets Manager | - | Credenciales con rotación automática |
| Config | AWS SSM Parameter Store | - | Variables de configuración no sensibles |
| CI/CD | GitHub Actions + OIDC | - | Sin access keys, tokens temporales |
| Docs | Docusaurus v3 | 3.6 | Mermaid, MDX, búsqueda |

## Por qué Go para el Core

1. **Rendimiento**: Go maneja 50,000+ requests/segundo en un contenedor de 512MB. Node.js necesita múltiples workers para lo mismo.
2. **Concurrencia nativa**: goroutines son 1000x más ligeras que threads. Publicar 5 eventos en paralelo es trivial.
3. **Binarios pequeños**: `go build` genera un binario estático de ~15MB. La imagen Docker base puede ser `scratch` o `alpine`.
4. **Tipado fuerte**: sin `any`, sin `undefined is not a function` en producción.
5. **La misma razón que usa Google, Cloudflare, Uber y Docker**: es el lenguaje correcto para infraestructura.

## Por qué NestJS para Integraciones

1. **Ecosistema npm**: los SDKs de Wompi, Siigo, Meta y Twilio son npm packages. Usarlos desde Go requiere wrappers o HTTP directo.
2. **Inyección de dependencias**: NestJS tiene DI nativo. Intercambiar `WompiService` por `PayUService` es cambiar una línea.
3. **Módulos por proveedor**: estructura natural para el patrón adapter.
4. **El equipo conoce TypeScript**: menos curva de aprendizaje para módulos de integración.

## Por qué Next.js para Frontends

1. **App Router + RSC**: Server Components reducen el JS enviado al cliente.
2. **SSR para Storefront**: mejora SEO y Core Web Vitals (crítico para conversiones).
3. **Tailwind CSS**: utility-first, consistencia de diseño sin CSS custom.
4. **Deploy estático o ECS**: los paneles admin son SPA; el Storefront necesita SSR.

## Por qué PostgreSQL (sin ORM)

1. **JSONB**: columnas `config`, `images`, `items`, `address` son JSONB. Evita tablas auxiliares para datos flexibles.
2. **UUID nativo**: `uuid-ossp` extension. Sin auto-increment, sin colisiones en multi-tenant.
3. **TIMESTAMPTZ**: almacena timezone. Crítico para negocios en múltiples regiones.
4. **Sin ORM**: pgx/v5 directo. SQL explícito, sin magia, sin N+1 silenciosos, queries optimizables con EXPLAIN ANALYZE.

## Por qué SQS (no RabbitMQ o Kafka)

1. **DLQ nativa**: AWS gestiona la cola de mensajes muertos sin configuración adicional.
2. **Serverless**: no hay broker que gestionar. Escala automáticamente.
3. **Pay-per-use**: costo aproximado $0.40 por millón de mensajes.
4. **ElasticMQ local**: 100% compatible con la API de SQS. Desarrollo local sin AWS.
5. **Kafka sería overkill**: para el volumen de Go Shopping en Etapa 1-5, SQS es suficiente y mucho más simple.
