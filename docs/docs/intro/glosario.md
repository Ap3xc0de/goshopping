---
sidebar_position: 4
---

# Glosario

Términos del dominio Go Shopping ordenados alfabeticamente.

## A

**Account**
La identidad raíz del sistema. Representa a una persona real con email y contraseña. Un Account puede ser `owner` (dueño de tiendas) o `superadmin` (equipo Go Shopping). Se crea una sola vez al registrarse.

**Audit Log**
Registro inmutable de todas las acciones sensibles del sistema: login, creación de facturas, cambios de precio, accesos. Nunca se borra. Se usa para compliance y debugging.

## C

**Core**
El microservicio central de Go Shopping. Escrito en Go + Fiber. Contiene toda la lógica de negocio: pedidos, inventario, clientes, auth. Todos los demás servicios se comunican con él via HTTP o SQS.

**CUFE**
Código Único de Factura Electrónica. Cadena de 96 caracteres hexadecimales generada por la DIAN que identifica unívocamente cada factura electrónica en Colombia. Sin CUFE, la factura no es válida ante la ley.

## D

**DIAN**
Dirección de Impuestos y Aduanas Nacionales de Colombia. Entidad que regula la facturación electrónica. Toda venta debe reportarse a la DIAN via XML firmado con certificado digital. Go Shopping automatiza esto via Siigo/Alegra.

**DLQ (Dead Letter Queue)**
Cola de mensajes "muertos". Cuando un mensaje SQS falla 3 veces consecutivas, va a la DLQ. Los mensajes en DLQ se retienen 14 días para análisis y reprocesamiento manual.

## E

**Event Bus**
El sistema de mensajería asíncrona de Go Shopping. En producción usa AWS SQS. En desarrollo local usa ElasticMQ (compatible con la API de SQS). Los eventos tienen el formato: `{ event_id, event_type, store_id, payload, timestamp }`.

## I

**Integration**
Registro en base de datos que conecta una tienda con un servicio externo (Wompi, Siigo, Meta Pixel). Tiene `type` (payment, accounting, marketing) y `config` JSONB con credenciales encriptadas.

## M

**Middleware**
En Go Shopping, tiene dos significados:
1. Go Shopping mismo es un "middleware" de e-commerce (el puente entre herramientas)
2. En el código Go, los middlewares de Fiber (auth, store_context, CORS, logger)

## O

**Operator**
Rol de store_user. Un empleado de la tienda con acceso al panel admin pero sin permisos de configuración de pagos ni contabilidad.

**Owner**
Rol principal de un Account. El dueño de la tienda. Tiene acceso completo al panel admin de sus tiendas.

## S

**SKU**
Stock Keeping Unit. Código único que identifica un producto específico dentro de una tienda. No es obligatorio en Go Shopping pero es recomendado para productos con variantes.

**Store**
Una tienda online dentro de Go Shopping. Tiene su propio dominio, catálogo, pedidos, clientes, integraciones y configuración. Un Account puede ser dueño de múltiples Stores.

**store_id**
El UUID de una Store. Presente en TODAS las tablas de recursos (products, orders, customers, integrations, audit_log). Es la clave del modelo multi-tenant. El middleware lo verifica en cada request autenticado.

**StoreFront**
El motor de tiendas públicas de Go Shopping. Genera la página web de la tienda donde el cliente final navega y compra. Es una app Next.js que se conecta al Core API via el Storefront SDK.

**SuperAdmin**
Rol especial exclusivo del equipo Go Shopping. Puede ver todas las cuentas, activar/suspender tiendas, acceder a métricas globales. NO puede ver pedidos ni datos de clientes de las tiendas.

## T

**Token de acceso (Access Token)**
JWT de vida corta (15 minutos) que autoriza cada request al API. Contiene: `{ sub: account_id, role, stores: [{store_id, role}], token_type: "access", exp, iat }`.

**Token de refresco (Refresh Token)**
JWT de vida larga (7 días) que permite renovar el access token sin que el usuario vuelva a hacer login. Se invalida al usarse (rotación).
