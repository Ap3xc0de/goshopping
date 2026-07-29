import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Go Shopping Docs',
  tagline: 'Middleware inteligente para e-commerce en Colombia y Latam',
  favicon: 'img/favicon.ico',

  url: 'https://docs.goshopping.co',
  baseUrl: '/',

  organizationName: 'goshopping',
  projectName: 'goshopping',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  markdown: {
    mermaid: true,
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/goshopping/goshopping/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Go Shopping',
      logo: {
        alt: 'Go Shopping Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'introSidebar',
          position: 'left',
          label: 'Introducción',
        },
        {
          type: 'docSidebar',
          sidebarId: 'arquitecturaSidebar',
          position: 'left',
          label: 'Arquitectura',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        {
          type: 'docSidebar',
          sidebarId: 'guiasSidebar',
          position: 'left',
          label: 'Guías',
        },
        {
          href: 'https://github.com/goshopping/goshopping',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentación',
          items: [
            {label: 'Introducción', to: '/docs/intro/que-es-goshopping'},
            {label: 'Arquitectura', to: '/docs/arquitectura/vision-general'},
            {label: 'API Reference', to: '/docs/api/overview'},
            {label: 'Guías', to: '/docs/guias/setup-local'},
          ],
        },
        {
          title: 'Más',
          items: [
            {label: 'GitHub', href: 'https://github.com/goshopping/goshopping'},
            {label: 'Decisiones (ADRs)', to: '/docs/decisiones/ADR-001-monorepo'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Go Shopping. Built with Docusaurus.`,
    },
    prism: {
      theme: {plain: {color: '#393A34', backgroundColor: '#f6f8fa'}, styles: []},
      darkTheme: {plain: {color: '#F8F8F2', backgroundColor: '#282A36'}, styles: []},
      additionalLanguages: ['go', 'bash', 'sql', 'typescript', 'json', 'hcl', 'yaml'],
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
