import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  introSidebar: [
    {
      type: 'category',
      label: 'Introducción',
      items: [
        'intro/que-es-goshopping',
        'intro/problema-que-resuelve',
        'intro/filosofia-del-producto',
        'intro/glosario',
      ],
    },
  ],
  arquitecturaSidebar: [
    {
      type: 'category',
      label: 'Arquitectura',
      items: [
        'arquitectura/vision-general',
        'arquitectura/capas-del-sistema',
        'arquitectura/monorepo',
        'arquitectura/stack-tecnologico',
        'arquitectura/flujo-de-datos',
        'arquitectura/event-driven-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Reglas de Negocio',
      items: [
        'reglas-de-negocio/modelo-de-negocio',
        'reglas-de-negocio/flujo-de-venta-completo',
        'reglas-de-negocio/estados-de-pedido',
        'reglas-de-negocio/gestion-de-inventario',
        'reglas-de-negocio/facturacion-electronica-dian',
        'reglas-de-negocio/multi-tienda',
        'reglas-de-negocio/roles-y-permisos',
        'reglas-de-negocio/integraciones-externas',
      ],
    },
    {
      type: 'category',
      label: 'Base de Datos',
      items: [
        'base-de-datos/esquema-general',
        {
          type: 'category',
          label: 'Tablas',
          items: [
            'base-de-datos/tablas/accounts',
            'base-de-datos/tablas/stores',
            'base-de-datos/tablas/store-users',
            'base-de-datos/tablas/products',
            'base-de-datos/tablas/customers',
            'base-de-datos/tablas/orders',
            'base-de-datos/tablas/order-timeline',
            'base-de-datos/tablas/integrations',
            'base-de-datos/tablas/audit-log',
          ],
        },
        'base-de-datos/migraciones',
        'base-de-datos/convenciones',
        'base-de-datos/multi-tenancy',
      ],
    },
  ],
  apiSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/autenticacion',
        {
          type: 'category',
          label: 'Endpoints',
          items: [
            'api/endpoints/auth',
            'api/endpoints/health',
            'api/endpoints/products',
            'api/endpoints/orders',
            'api/endpoints/customers',
            'api/endpoints/public-storefront',
            'api/endpoints/superadmin',
          ],
        },
        'api/errores',
        'api/paginacion',
      ],
    },
    {
      type: 'category',
      label: 'Servicios',
      items: [
        'servicios/core-api',
        'servicios/integrations-service',
        'servicios/ai-engine',
        'servicios/superadmin-panel',
        'servicios/admin-panel',
        'servicios/storefront-engine',
      ],
    },
  ],
  guiasSidebar: [
    {
      type: 'category',
      label: 'Guías',
      items: [
        'guias/setup-local',
        'guias/primer-deploy',
        'guias/agregar-endpoint',
        'guias/crear-migracion',
        'guias/agregar-integracion',
        'guias/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Infraestructura',
      items: [
        'infraestructura/aws-overview',
        'infraestructura/terraform',
        'infraestructura/oidc-github-actions',
        'infraestructura/secretos-y-variables',
        'infraestructura/ci-cd',
        'infraestructura/ambientes',
        'infraestructura/docker-local',
      ],
    },
    {
      type: 'category',
      label: 'Seguridad',
      items: [
        'seguridad/autenticacion-jwt',
        'seguridad/autorizacion-rbac',
        'seguridad/store-isolation',
        'seguridad/secretos',
        'seguridad/webhooks-hmac',
        'seguridad/owasp-checklist',
      ],
    },
    {
      type: 'category',
      label: 'Decisiones (ADRs)',
      items: [
        'decisiones/ADR-001-monorepo',
        'decisiones/ADR-002-go-fiber-core',
        'decisiones/ADR-003-nestjs-integraciones',
        'decisiones/ADR-004-oidc-deploy',
        'decisiones/ADR-005-multi-tenant-store-id',
        'decisiones/ADR-006-event-driven-sqs',
        'decisiones/ADR-007-secretos-aws',
      ],
    },
  ],
};

export default sidebars;
