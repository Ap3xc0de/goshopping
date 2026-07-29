'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useStoreConfig } from '@goshopping/storefront-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { config } = useStoreConfig(storeSlug);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Real implementation would POST to an API
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-heading font-bold mb-2">Contacto</h1>
      <p className="text-muted-foreground mb-10">
        ¿Tienes preguntas? Escríbenos y te respondemos a la brevedad.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
            <span>contacto@{config?.name?.toLowerCase().replace(/\s+/g, '') ?? storeSlug}.co</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
            <span>+57 300 000 0000</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
            <span>Colombia</span>
          </div>
        </div>

        {submitted ? (
          <div className="flex items-center justify-center p-8 bg-green-50 rounded-xl text-center">
            <div>
              <p className="font-semibold text-green-700 mb-1">¡Mensaje enviado!</p>
              <p className="text-sm text-green-600">Te responderemos pronto.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Tu nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              type="email"
              placeholder="Tu email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <textarea
              placeholder="Tu mensaje"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
              rows={4}
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" className="w-full">
              Enviar mensaje
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
