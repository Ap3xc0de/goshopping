import { StoreGenerationResult, GeneratedPage } from './generation-pipeline';
import { StoreConfig } from './store-config-builder';

export interface StoreFile {
  path: string;
  content: string;
  type: 'page' | 'component' | 'layout' | 'config' | 'style';
}

export interface AssembledStore {
  storeSlug: string;
  storeId: string;
  templateId: string;
  files: StoreFile[];
  cssVariables: Record<string, string>;
  storeConfig: StoreConfig;
  assembledAt: string;
}

const FONT_IMPORT_MAP: Record<string, { import: string; variable: string }> = {
  'Playfair Display': { import: 'Playfair_Display', variable: '--font-playfair-display' },
  Montserrat: { import: 'Montserrat', variable: '--font-montserrat' },
  'Cormorant Garamond': { import: 'Cormorant_Garamond', variable: '--font-cormorant-garamond' },
  'Bebas Neue': { import: 'Bebas_Neue', variable: '--font-bebas-neue' },
  'Space Grotesk': { import: 'Space_Grotesk', variable: '--font-space-grotesk' },
  Nunito: { import: 'Nunito', variable: '--font-nunito' },
  Inter: { import: 'Inter', variable: '--font-inter' },
  Roboto: { import: 'Roboto', variable: '--font-roboto' },
  Lato: { import: 'Lato', variable: '--font-lato' },
  Poppins: { import: 'Poppins', variable: '--font-poppins' },
  'Open Sans': { import: 'Open_Sans', variable: '--font-open-sans' },
};

const PAGE_ROUTE_MAP: Record<string, string> = {
  HomePage: '',
  CatalogPage: 'catalogo',
  ProductPage: 'producto/[id]',
  CheckoutPage: 'checkout',
  AboutPage: 'nosotros',
  ContactPage: 'contacto',
  FAQPage: 'faq',
};

export class StoreAssembler {
  assemble(
    generationResult: StoreGenerationResult,
    storeConfig: StoreConfig,
    storeSlug: string,
    storeId: string,
    templateId: string,
  ): AssembledStore {
    const files: StoreFile[] = [];

    // 1. Global CSS with CSS variables
    files.push(this.createGlobalCSS(generationResult.cssVariables));

    // 2. Root layout with fonts + metadata + CartProvider
    files.push(this.createRootLayout(storeConfig, generationResult.cssVariables));

    // 3. CartProvider
    files.push(this.createCartProvider(storeSlug));

    // 4. Store config file
    files.push(this.createStoreConfigFile(storeConfig, storeSlug));

    // 5. Store layout (Navbar + Footer wrapper)
    files.push(this.createStoreLayout(storeConfig, templateId));

    // 6. Map generated pages to Next.js routes
    for (const page of generationResult.pages) {
      const route = this.pageNameToRoute(page.name);
      const filePath = route === '' ? 'app/page.tsx' : `app/${route}/page.tsx`;
      files.push({
        path: filePath,
        content: this.wrapPageComponent(page, storeSlug),
        type: 'page',
      });
    }

    return {
      storeSlug,
      storeId,
      templateId,
      files,
      cssVariables: generationResult.cssVariables,
      storeConfig,
      assembledAt: new Date().toISOString(),
    };
  }

  pageNameToRoute(pageName: string): string {
    return PAGE_ROUTE_MAP[pageName] ?? pageName.toLowerCase().replace('page', '');
  }

  wrapPageComponent(page: GeneratedPage, storeSlug: string): string {
    let code = page.code.trim();

    // Ensure 'use client' is present
    if (!code.startsWith("'use client'") && !code.startsWith('"use client"')) {
      code = `'use client';\n\n${code}`;
    }

    // Inject storeSlug constant if not present
    if (!code.includes('storeSlug') && code.includes('@goshopping/storefront-sdk')) {
      code = code.replace(
        /^('use client'[;\s\n]*)/,
        `$1\nconst storeSlug = '${storeSlug}';\n`,
      );
    }

    return code;
  }

  createRootLayout(config: StoreConfig, cssVars: Record<string, string>): StoreFile {
    const headingFont = cssVars['--font-heading'] ?? 'Inter';
    const bodyFont = cssVars['--font-body'] ?? 'Inter';

    const headingMeta = FONT_IMPORT_MAP[headingFont];
    const bodyMeta = FONT_IMPORT_MAP[bodyFont];

    // Deduplicate if both fonts are the same
    const fontsToImport: Array<{ name: string; importName: string; varName: string }> = [];
    const seen = new Set<string>();

    for (const meta of [headingMeta, bodyMeta]) {
      if (meta && !seen.has(meta.import)) {
        seen.add(meta.import);
        fontsToImport.push({ name: meta.import, importName: meta.import, varName: meta.variable });
      }
    }

    const fontImports = fontsToImport
      .map((f) => `import { ${f.importName} } from 'next/font/google';`)
      .join('\n');

    const fontInits = fontsToImport
      .map((f) => `const font${f.importName} = ${f.importName}({ subsets: ['latin'], variable: '${f.varName}' });`)
      .join('\n');

    const fontClassStr = fontsToImport.map((f) => `font${f.importName}.variable`).join(' + " " + ');

    const cssVarInlineStyle = Object.entries(cssVars)
      .map(([k, v]) => `'${k}': '${v}'`)
      .join(', ');

    const content = `import type { Metadata } from 'next';
${fontImports}
import './globals.css';
import { CartProvider } from './providers/CartProvider';

${fontInits}

export const metadata: Metadata = {
  title: '${config.name}',
  description: '${config.tagline || config.name} — tienda online',
  openGraph: {
    title: '${config.name}',
    description: '${config.tagline || config.name}',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={${fontClassStr}}
        style={{ ${cssVarInlineStyle} }}
      >
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
`;
    return { path: 'app/layout.tsx', content, type: 'layout' };
  }

  createGlobalCSS(cssVars: Record<string, string>): StoreFile {
    const varBlock = Object.entries(cssVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');

    const content = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
${varBlock}
}
`;
    return { path: 'app/globals.css', content, type: 'style' };
  }

  createStoreLayout(config: StoreConfig, _templateId: string): StoreFile {
    const content = `'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const navLinks = [
    { label: 'Inicio', href: '/' },
    { label: 'Catálogo', href: '/catalogo' },
${config.pages.includes('nosotros') ? "    { label: 'Nosotros', href: '/nosotros' }," : ''}
${config.pages.includes('contacto') ? "    { label: 'Contacto', href: '/contacto' }," : ''}
  ].filter(Boolean);

  return (
    <>
      <Navbar
        storeName="${config.name}"
        links={navLinks}
        variant="solid"
      />
      <main>{children}</main>
      <Footer
        storeName="${config.name}"
        links={navLinks}
      />
    </>
  );
}
`;
    return { path: 'app/(store)/layout.tsx', content, type: 'layout' };
  }

  createStoreConfigFile(config: StoreConfig, storeSlug: string): StoreFile {
    const content = `// Auto-generated by GoShopping AI Engine
export const storeConfig = ${JSON.stringify(config, null, 2)};
export const storeSlug = '${storeSlug}';
`;
    return { path: 'lib/store-config.ts', content, type: 'config' };
  }

  createCartProvider(storeSlug: string): StoreFile {
    const content = `'use client';

import { createContext, useContext } from 'react';
import { useCart } from '@goshopping/storefront-sdk';

type CartContextValue = ReturnType<typeof useCart>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart('${storeSlug}');
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useStoreCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useStoreCart must be used within CartProvider');
  return ctx;
}
`;
    return { path: 'app/providers/CartProvider.tsx', content, type: 'component' };
  }
}
