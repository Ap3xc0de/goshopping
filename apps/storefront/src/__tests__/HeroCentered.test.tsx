/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HeroCentered } from '@/components/hero/HeroCentered';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('HeroCentered', () => {
  const BASE_PROPS = {
    title: 'Nueva Colección 2026',
    ctaLabel: 'Comprar ahora',
    ctaHref: '/tienda',
  };

  it('renders title', () => {
    render(<HeroCentered {...BASE_PROPS} />);
    expect(screen.getByText('Nueva Colección 2026')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<HeroCentered {...BASE_PROPS} subtitle="Descubre las últimas tendencias" />);
    expect(screen.getByText('Descubre las últimas tendencias')).toBeInTheDocument();
  });

  it('renders CTA button/link', () => {
    render(<HeroCentered {...BASE_PROPS} />);
    expect(screen.getByText('Comprar ahora')).toBeInTheDocument();
  });

  it('CTA links to correct href', () => {
    render(<HeroCentered {...BASE_PROPS} />);
    const cta = screen.getByText('Comprar ahora').closest('a');
    expect(cta).toHaveAttribute('href', '/tienda');
  });

  it('renders secondary CTA when provided', () => {
    render(
      <HeroCentered
        {...BASE_PROPS}
        ctaSecondaryLabel="Ver catálogo"
        ctaSecondaryHref="/catalogo"
      />
    );
    expect(screen.getByText('Ver catálogo')).toBeInTheDocument();
  });

  it('renders background image div when backgroundImage prop is provided', () => {
    const { container } = render(
      <HeroCentered {...BASE_PROPS} backgroundImage="https://example.com/img.jpg" />
    );
    const bgEl = container.querySelector('[style*="background"]');
    expect(bgEl).toBeTruthy();
  });

  it('renders as a section element', () => {
    const { container } = render(<HeroCentered {...BASE_PROPS} />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });
});
