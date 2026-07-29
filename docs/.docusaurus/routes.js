import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '4bc'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'ff8'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '210'),
            routes: [
              {
                path: '/docs/api/autenticacion',
                component: ComponentCreator('/docs/api/autenticacion', '407'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/auth',
                component: ComponentCreator('/docs/api/endpoints/auth', 'ee2'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/customers',
                component: ComponentCreator('/docs/api/endpoints/customers', '8df'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/health',
                component: ComponentCreator('/docs/api/endpoints/health', 'cab'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/orders',
                component: ComponentCreator('/docs/api/endpoints/orders', '721'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/products',
                component: ComponentCreator('/docs/api/endpoints/products', '910'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/public-storefront',
                component: ComponentCreator('/docs/api/endpoints/public-storefront', 'a50'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/endpoints/superadmin',
                component: ComponentCreator('/docs/api/endpoints/superadmin', '123'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/errores',
                component: ComponentCreator('/docs/api/errores', 'fe6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/overview',
                component: ComponentCreator('/docs/api/overview', '1fc'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/paginacion',
                component: ComponentCreator('/docs/api/paginacion', '9c7'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/arquitectura/capas-del-sistema',
                component: ComponentCreator('/docs/arquitectura/capas-del-sistema', '7df'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/arquitectura/event-driven-architecture',
                component: ComponentCreator('/docs/arquitectura/event-driven-architecture', '931'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/arquitectura/flujo-de-datos',
                component: ComponentCreator('/docs/arquitectura/flujo-de-datos', '191'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/arquitectura/monorepo',
                component: ComponentCreator('/docs/arquitectura/monorepo', '092'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/arquitectura/stack-tecnologico',
                component: ComponentCreator('/docs/arquitectura/stack-tecnologico', 'a44'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/arquitectura/vision-general',
                component: ComponentCreator('/docs/arquitectura/vision-general', '9fa'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/convenciones',
                component: ComponentCreator('/docs/base-de-datos/convenciones', '6c3'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/esquema-general',
                component: ComponentCreator('/docs/base-de-datos/esquema-general', 'f33'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/migraciones',
                component: ComponentCreator('/docs/base-de-datos/migraciones', 'c2b'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/multi-tenancy',
                component: ComponentCreator('/docs/base-de-datos/multi-tenancy', '6c7'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/accounts',
                component: ComponentCreator('/docs/base-de-datos/tablas/accounts', '766'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/audit-log',
                component: ComponentCreator('/docs/base-de-datos/tablas/audit-log', '4d8'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/customers',
                component: ComponentCreator('/docs/base-de-datos/tablas/customers', 'a8c'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/integrations',
                component: ComponentCreator('/docs/base-de-datos/tablas/integrations', '685'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/order-timeline',
                component: ComponentCreator('/docs/base-de-datos/tablas/order-timeline', '826'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/orders',
                component: ComponentCreator('/docs/base-de-datos/tablas/orders', '633'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/products',
                component: ComponentCreator('/docs/base-de-datos/tablas/products', '14f'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/store-users',
                component: ComponentCreator('/docs/base-de-datos/tablas/store-users', 'd25'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/base-de-datos/tablas/stores',
                component: ComponentCreator('/docs/base-de-datos/tablas/stores', '995'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/decisiones/ADR-001-monorepo',
                component: ComponentCreator('/docs/decisiones/ADR-001-monorepo', '6ed'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/decisiones/ADR-002-go-fiber-core',
                component: ComponentCreator('/docs/decisiones/ADR-002-go-fiber-core', 'be1'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/decisiones/ADR-003-nestjs-integraciones',
                component: ComponentCreator('/docs/decisiones/ADR-003-nestjs-integraciones', '828'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/decisiones/ADR-004-oidc-deploy',
                component: ComponentCreator('/docs/decisiones/ADR-004-oidc-deploy', 'a52'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/decisiones/ADR-005-multi-tenant-store-id',
                component: ComponentCreator('/docs/decisiones/ADR-005-multi-tenant-store-id', '971'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/decisiones/ADR-006-event-driven-sqs',
                component: ComponentCreator('/docs/decisiones/ADR-006-event-driven-sqs', 'ab9'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/decisiones/ADR-007-secretos-aws',
                component: ComponentCreator('/docs/decisiones/ADR-007-secretos-aws', 'c7d'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/agregar-endpoint',
                component: ComponentCreator('/docs/guias/agregar-endpoint', 'b1a'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/agregar-integracion',
                component: ComponentCreator('/docs/guias/agregar-integracion', 'ffa'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/crear-migracion',
                component: ComponentCreator('/docs/guias/crear-migracion', '80b'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/docker-local',
                component: ComponentCreator('/docs/guias/docker-local', '8ea'),
                exact: true
              },
              {
                path: '/docs/guias/primer-deploy',
                component: ComponentCreator('/docs/guias/primer-deploy', '353'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/setup-local',
                component: ComponentCreator('/docs/guias/setup-local', '90b'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/tests-etapa1',
                component: ComponentCreator('/docs/guias/tests-etapa1', 'fe8'),
                exact: true
              },
              {
                path: '/docs/guias/troubleshooting',
                component: ComponentCreator('/docs/guias/troubleshooting', '727'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/guias/variables-de-entorno',
                component: ComponentCreator('/docs/guias/variables-de-entorno', '3b4'),
                exact: true
              },
              {
                path: '/docs/infraestructura/ambientes',
                component: ComponentCreator('/docs/infraestructura/ambientes', 'e5d'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/infraestructura/aws-overview',
                component: ComponentCreator('/docs/infraestructura/aws-overview', '091'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/infraestructura/ci-cd',
                component: ComponentCreator('/docs/infraestructura/ci-cd', 'e13'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/infraestructura/docker-local',
                component: ComponentCreator('/docs/infraestructura/docker-local', 'e91'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/infraestructura/oidc-github-actions',
                component: ComponentCreator('/docs/infraestructura/oidc-github-actions', 'ed6'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/infraestructura/secretos-y-variables',
                component: ComponentCreator('/docs/infraestructura/secretos-y-variables', 'f14'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/infraestructura/terraform',
                component: ComponentCreator('/docs/infraestructura/terraform', '981'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/intro/filosofia-del-producto',
                component: ComponentCreator('/docs/intro/filosofia-del-producto', '7ae'),
                exact: true,
                sidebar: "introSidebar"
              },
              {
                path: '/docs/intro/glosario',
                component: ComponentCreator('/docs/intro/glosario', '270'),
                exact: true,
                sidebar: "introSidebar"
              },
              {
                path: '/docs/intro/problema-que-resuelve',
                component: ComponentCreator('/docs/intro/problema-que-resuelve', 'eb7'),
                exact: true,
                sidebar: "introSidebar"
              },
              {
                path: '/docs/intro/que-es-goshopping',
                component: ComponentCreator('/docs/intro/que-es-goshopping', '9c1'),
                exact: true,
                sidebar: "introSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/estados-de-pedido',
                component: ComponentCreator('/docs/reglas-de-negocio/estados-de-pedido', '51a'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/facturacion-electronica-dian',
                component: ComponentCreator('/docs/reglas-de-negocio/facturacion-electronica-dian', '818'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/flujo-de-venta-completo',
                component: ComponentCreator('/docs/reglas-de-negocio/flujo-de-venta-completo', '7ab'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/gestion-de-inventario',
                component: ComponentCreator('/docs/reglas-de-negocio/gestion-de-inventario', 'f25'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/integraciones-externas',
                component: ComponentCreator('/docs/reglas-de-negocio/integraciones-externas', '4e8'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/modelo-de-negocio',
                component: ComponentCreator('/docs/reglas-de-negocio/modelo-de-negocio', 'be8'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/multi-tienda',
                component: ComponentCreator('/docs/reglas-de-negocio/multi-tienda', 'bf4'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/reglas-de-negocio/roles-y-permisos',
                component: ComponentCreator('/docs/reglas-de-negocio/roles-y-permisos', 'e99'),
                exact: true,
                sidebar: "arquitecturaSidebar"
              },
              {
                path: '/docs/seguridad/autenticacion-jwt',
                component: ComponentCreator('/docs/seguridad/autenticacion-jwt', 'b03'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/seguridad/autorizacion-rbac',
                component: ComponentCreator('/docs/seguridad/autorizacion-rbac', 'b46'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/seguridad/owasp-checklist',
                component: ComponentCreator('/docs/seguridad/owasp-checklist', 'd4b'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/seguridad/secretos',
                component: ComponentCreator('/docs/seguridad/secretos', '4bc'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/seguridad/store-isolation',
                component: ComponentCreator('/docs/seguridad/store-isolation', '5ce'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/seguridad/webhooks-hmac',
                component: ComponentCreator('/docs/seguridad/webhooks-hmac', '7c7'),
                exact: true,
                sidebar: "guiasSidebar"
              },
              {
                path: '/docs/servicios/admin-panel',
                component: ComponentCreator('/docs/servicios/admin-panel', '4e8'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/servicios/ai-engine',
                component: ComponentCreator('/docs/servicios/ai-engine', '84f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/servicios/core-api',
                component: ComponentCreator('/docs/servicios/core-api', '9cd'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/servicios/integrations-service',
                component: ComponentCreator('/docs/servicios/integrations-service', '4bd'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/servicios/storefront-engine',
                component: ComponentCreator('/docs/servicios/storefront-engine', 'cc3'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/servicios/superadmin-panel',
                component: ComponentCreator('/docs/servicios/superadmin-panel', '094'),
                exact: true,
                sidebar: "apiSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
