---
sidebar_position: 5
---

# Flujo de Datos — Una Venta Completa

Este diagrama muestra el ciclo de vida completo de una venta en Go Shopping, desde que el cliente navega la tienda hasta que la contabilidad queda actualizada.

## Diagrama de Secuencia

```mermaid
sequenceDiagram
    actor Cliente
    participant SF as Storefront
    participant API as Core API
    participant PG as PostgreSQL
    participant SQS as Event Bus (SQS)
    participant INT as Integrations
    participant WOMPI as Wompi
    participant SIIGO as Siigo/DIAN

    Note over Cliente,SIIGO: PASO 1-2: Navegación y checkout

    Cliente->>SF: Navega tienda, agrega al carrito
    SF->>API: GET /stores/:id/products
    API->>PG: SELECT products WHERE store_id=?
    PG-->>API: Lista de productos
    API-->>SF: JSON productos
    SF-->>Cliente: Renderiza tienda

    Cliente->>SF: Confirma pedido
    SF->>API: POST /stores/:id/orders
    API->>PG: INSERT order (status=pending)
    PG-->>API: order_id generado
    API-->>SF: { order_id, checkout_url }

    Note over Cliente,SIIGO: PASO 3: Procesamiento de pago

    Cliente->>WOMPI: Ingresa datos de pago
    WOMPI->>API: Webhook: pago confirmado
    API->>PG: UPDATE orders SET status=paid
    API->>PG: INSERT order_timeline

    Note over Cliente,SIIGO: PASO 4: Eventos paralelos (< 1 segundo)

    API->>SQS: PUBLISH order.paid (x5 colas)

    par Eventos paralelos
        SQS->>INT: order.paid → descontar inventario
        INT->>PG: UPDATE products stock
    and
        SQS->>INT: order.paid → crear factura
        INT->>SIIGO: POST /invoices
        SIIGO->>INT: CUFE generado
    and
        SQS->>INT: order.paid → notificar cliente
        INT->>Cliente: Email + WhatsApp confirmación
    and
        SQS->>INT: order.paid → notificar vendedor
        INT->>Vendedor: Email "Nuevo pedido"
    and
        SQS->>INT: order.paid → conversión marketing
        INT->>Meta: Track Purchase event
    end

    Note over Cliente,SIIGO: PASO 5-8: Fulfillment

    Vendedor->>API: PUT /orders/:id (status=preparing)
    API->>SQS: PUBLISH order.preparing
    Vendedor->>API: PUT /orders/:id (status=shipped, tracking=xxx)
    API->>SQS: PUBLISH order.shipped
    SQS->>INT: order.shipped → notificar cliente
    INT->>Cliente: "Tu pedido va en camino: tracking"

    Cliente->>SF: Confirma recepción
    SF->>API: PUT /orders/:id (status=delivered)
    API->>SQS: PUBLISH order.delivered
    SQS->>INT: order.delivered → contabilidad
    INT->>SIIGO: Asiento contable final
```

## Los 8 pasos resumidos

| Paso | Actor | Acción | Resultado |
|---|---|---|---|
| 1 | Cliente | Navega tienda | Productos cargados del Core API |
| 2 | Cliente | Confirma pedido | Orden creada (status=`pending`) |
| 3 | Wompi | Procesa pago | Webhook → orden cambia a `paid` |
| 4 | Sistema | Automático | 5 eventos disparados en paralelo |
| 5 | Vendedor | Alista pedido | Orden cambia a `preparing` |
| 6 | Vendedor | Despacha | Orden cambia a `shipped`, cliente recibe tracking |
| 7 | Cliente | Confirma recepción | Orden cambia a `delivered` |
| 8 | Sistema | Automático | Contabilidad actualizada, asiento creado |

## Garantías del sistema

- **Idempotencia**: cada evento tiene `event_id` UUID. El consumidor verifica si ya procesó ese ID.
- **Reintentos**: máximo 3 intentos antes de ir a DLQ.
- **Orden**: dentro de cada cola SQS los mensajes se procesan en orden de llegada.
- **Timeout**: `defaultVisibilityTimeout = 10 segundos`. Si el consumidor no confirma en 10s, el mensaje vuelve a la cola.
