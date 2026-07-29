export interface PartialStoreConfig {
  name?: string;
  category?: string;
  style?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  tagline?: string;
  logo_url?: string | null;
  pages?: string[];
}

export interface StoreConfig {
  name: string;
  category: string;
  style: string;
  colors: { primary: string; secondary: string; accent: string };
  tagline: string;
  logo_url: string | null;
  pages: string[];
}

export class StoreConfigBuilder {
  build(partial: PartialStoreConfig): StoreConfig {
    const primary = partial.colors?.primary || '142 71% 45%';
    return {
      name: partial.name || 'Mi Tienda',
      category: partial.category || 'general',
      style: partial.style || 'minimal',
      colors: {
        primary,
        secondary: partial.colors?.secondary || this.generateSecondary(primary),
        accent: partial.colors?.accent || this.generateAccent(primary),
      },
      tagline: partial.tagline || '',
      logo_url: partial.logo_url ?? null,
      pages: partial.pages || ['inicio', 'catalogo'],
    };
  }

  private generateSecondary(primary: string): string {
    return this.shiftHue(primary, 180) ?? '215 28% 17%';
  }

  private generateAccent(primary: string): string {
    return this.shiftHue(primary, 60) ?? '24 95% 53%';
  }

  private shiftHue(hsl: string, degrees: number): string | null {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const hue = (parseInt(parts[0], 10) + degrees) % 360;
    return `${hue < 0 ? hue + 360 : hue} ${parts[1]} ${parts[2]}`;
  }
}
