import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateGalleryStep } from '../TemplateGalleryStep';
import type { TemplateManifest } from '@goshopping/template-catalog';

function makeTemplate(overrides: Partial<TemplateManifest>): TemplateManifest {
  return {
    id: 't1',
    name: 'Template One',
    description: 'Desc',
    category: ['General'],
    colors: {
      primary: '0 0% 0%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 90%',
      secondaryForeground: '0 0% 0%',
      accent: '0 0% 50%',
      accentForeground: '0 0% 100%',
      background: '0 0% 100%',
      foreground: '0 0% 0%',
      muted: '0 0% 96%',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    components: { navbar: 'solid', hero: 'centered', footer: 'minimal', productCard: 'compact' },
    homeSections: ['ProductGrid'],
    style: { sectionSpacing: '1rem', borderRadius: 'sharp', shadows: 'none' },
    ...overrides,
  };
}

const MOCK_TEMPLATES: TemplateManifest[] = [
  makeTemplate({ id: 't1', name: 'Template One' }),
  makeTemplate({ id: 't2', name: 'Template Two' }),
];

jest.mock('@goshopping/template-catalog', () => ({
  getAllTemplates: () => MOCK_TEMPLATES,
}));

describe('TemplateGalleryStep', () => {
  it('renders one card per template returned by getAllTemplates()', () => {
    render(<TemplateGalleryStep onSelect={jest.fn()} />);
    expect(screen.getByTestId('template-card-t1')).toBeInTheDocument();
    expect(screen.getByTestId('template-card-t2')).toBeInTheDocument();
  });

  it('renders StorePreview for the currently highlighted template', () => {
    render(<TemplateGalleryStep selectedTemplateId="t2" onSelect={jest.fn()} />);
    expect(screen.getByTestId('store-preview')).toBeInTheDocument();
  });

  it('highlights the currently selected template card', () => {
    render(<TemplateGalleryStep selectedTemplateId="t2" onSelect={jest.fn()} />);
    expect(screen.getByTestId('template-card-t2').className).toMatch(/border-brand-600/);
    expect(screen.getByTestId('template-card-t1').className).not.toMatch(/border-brand-600/);
  });

  it('selecting a template calls onSelect with the template id', () => {
    const onSelect = jest.fn();
    render(<TemplateGalleryStep onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('template-card-t2'));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });
});
