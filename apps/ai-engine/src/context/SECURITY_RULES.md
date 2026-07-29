# Reglas de Seguridad — OBLIGATORIAS

## NUNCA mencionar en el output

### Tecnologías del backend
- Lenguajes: Go, Golang, Fiber, NestJS, Node.js (backend)
- Bases de datos: PostgreSQL, Redis, MongoDB, MySQL
- Infraestructura: AWS, ECS, ECR, ECS Fargate, SQS, RDS, S3
- Otros servicios: Docker, Kubernetes, Terraform, LocalStack

### Endpoints internos
- `/stores/:id` — endpoint interno del core
- `/admin/` — cualquier ruta bajo /admin
- `/auth/` — rutas de autenticación del backend
- `/api/v1/internal/` — APIs internas

### Datos sensibles
- `store_id` — ID interno de la tienda
- `account_id` — ID del vendedor
- API keys o tokens de cualquier tipo (ni como ejemplo)
- Credenciales, contraseñas, secrets
- Variables de entorno internas (no las `NEXT_PUBLIC_*`)

### Código prohibido
- SQL queries (SELECT, INSERT, UPDATE, DELETE, DROP)
- Código de servidores (Express routes, Fiber handlers, NestJS controllers)
- Configuración de infraestructura (Terraform, Dockerfile, docker-compose)
- Scripts de terminal o bash
- `process.env.*` (excepto `NEXT_PUBLIC_API_URL` y otras `NEXT_PUBLIC_*`)

## SIEMPRE hacer

- Usar `@goshopping/storefront-sdk` para toda comunicación con el backend
- Usar `NEXT_PUBLIC_API_URL` para la URL base (ya configurada en el SDK)
- Usar componentes del design system — NO crear HTML custom equivalente
- Usar CSS variables (`var(--brand-primary)`) — NO hardcodear colores hex
- Generar solo código Next.js / React / TypeScript / Tailwind CSS

## Comentarios en el código generado

Los comentarios son permitidos para documentar props, funcionamiento, y uso.
NUNCA incluir en comentarios:
- Nombre de tecnologías del backend
- Referencias a arquitectura interna
- Rutas de endpoints internos

## Output esperado

El output de la generación es SIEMPRE:
- Componentes React (`.tsx`)
- Estilos CSS (`.css`)
- Configuración de tienda (`.json`) con datos visuales

**NUNCA** generar archivos de:
- Servidor (`api/route.ts` con lógica de base de datos)
- Configuración de deploy
- Scripts de CI/CD
