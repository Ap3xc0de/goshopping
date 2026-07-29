---
sidebar_position: 3
---

# Filosofía del producto

## Lo que SÍ construimos

Go Shopping construye exclusivamente lo que no existe como producto independiente para PYMEs latinoamericanas:

| Módulo | Descripción | Estado |
|---|---|---|
| **Core** | Pedidos, inventario, clientes, automatización | ✅ Etapa 1 |
| **Panel Admin** | Dashboard del vendedor | ✅ Etapa 1 (boilerplate) |
| **Panel SuperAdmin** | Dashboard interno Go Shopping | ✅ Etapa 1 (boilerplate) |
| **Pasarelas de pago** | Wompi, PayU (adapter pattern) | 🔜 Etapa 5 |
| **Contabilidad auto** | Siigo, Alegra (factura DIAN) | 🔜 Etapa 6 |
| **Generador de tiendas con IA** | AI Engine + Storefront | 🔜 Etapa 7 |
| **Marketing integrado** | Meta Pixel, Google Ads, Brevo | 🔜 Etapa 8 |
| **WhatsApp Business** | Twilio API | 🔜 Etapa 8 |

## Lo que NO construimos y por qué

### Constructor web propio ❌
**Por qué no**: Webflow, WordPress y Shopify Themes ya resuelven esto con décadas de madurez. Construir un constructor visual desde cero tomaría años y recursos que no justifican el ROI. Go Shopping usa Next.js para el **Motor de Tiendas**, que genera una tienda pre-diseñada y optimizada, no un editor visual genérico.

### Sistema contable propio ❌
**Por qué no**: La facturación electrónica en Colombia está regulada por la DIAN y requiere certificación oficial, pruebas técnicas y habilitación del proveedor tecnológico. Siigo y Alegra ya tienen esta certificación. Go Shopping se integra con ellos mediante adapters.

### Pasarela de pagos propia ❌
**Por qué no**: La regulación de la Superfinanciera de Colombia exige licencia como establecimiento de crédito o intermediario de pagos para procesar dinero. Wompi (Bancolombia) y PayU ya tienen esta licencia. Go Shopping orquesta el checkout y delega la transacción.

### Plataforma de ads propia ❌
**Por qué no**: Meta y Google Ads tienen acceso a datos de billones de usuarios. Ninguna startup puede competir con esto. Go Shopping se conecta a sus APIs para rastrear conversiones y optimizar campañas, pero no construye plataforma de medios.

### App de mensajería propia ❌
**Por qué no**: WhatsApp tiene 2B usuarios. Construir una app de mensajería es innecesario y prohibido. Go Shopping usa la WhatsApp Business API (Twilio como gateway) para notificaciones y atención al cliente.

## Principios de diseño

### 1. API-first
El Core API es el centro. Todo — frontends, integraciones, IA — accede al Core via HTTP. Nunca acceso directo a base de datos desde frontends.

### 2. Event-driven por defecto
Toda acción con efectos secundarios (pago confirmado → factura → notificación → inventario) se ejecuta via eventos SQS. El Core no llama directamente al servicio de contabilidad. Esto garantiza:
- Desacoplamiento total entre servicios
- Reintentos automáticos (DLQ)
- Observabilidad (cada evento queda registrado)

### 3. Store isolation desde el día 1
Cada recurso (producto, pedido, cliente) tiene `store_id`. No hay forma de acceder a datos de otra tienda. El middleware lo verifica en cada request, antes de tocar base de datos.

### 4. Zero-trust en infraestructura
Ningún secreto en código. Ningún access key en GitHub. Todo en AWS Secrets Manager. CI/CD usa OIDC (tokens temporales que expiran en minutos).

### 5. Un desarrollador nuevo debe poder operar el sistema solo con la documentación
Si esto no es posible, la documentación está incompleta.
