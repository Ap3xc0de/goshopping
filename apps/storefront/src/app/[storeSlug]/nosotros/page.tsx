'use client';

import { useParams } from 'next/navigation';
import { useStoreConfig } from '@goshopping/storefront-sdk';

export default function AboutPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { config } = useStoreConfig(storeSlug);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-heading font-bold mb-6">Nosotros</h1>
      {config?.tagline && (
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">{config.tagline}</p>
      )}
      <p className="text-muted-foreground leading-relaxed">
        Somos <strong>{config?.name}</strong>, una tienda comprometida con ofrecer la mejor
        experiencia de compra en la categoría de {config?.category ?? 'productos'}.
        Nuestro objetivo es brindarte calidad, confianza y excelente servicio en cada pedido.
      </p>
    </div>
  );
}
