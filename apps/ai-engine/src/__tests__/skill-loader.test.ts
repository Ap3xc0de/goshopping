import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const CONTEXT_DIR = path.join(__dirname, '..', 'context');

const ALL_SKILLS = [
  'LAYOUT.md',
  'DESIGN_SYSTEM.md',
  'COMPONENTS.md',
  'COLOR_ENGINE.md',
  'TYPOGRAPHY.md',
  'SEO.md',
  'ACCESSIBILITY.md',
  'RESPONSIVE.md',
  'ECOMMERCE_UX.md',
];

const ALL_CONTEXT_DOCS = [
  'API_REFERENCE.md',
  'SDK_REFERENCE.md',
  'SECURITY_RULES.md',
  'TEMPLATE_CATALOG.md',
];

describe('Skill files existence and content', () => {
  test.each(ALL_SKILLS)('%s exists and is non-empty', (filename) => {
    const filepath = path.join(SKILLS_DIR, filename);
    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content.trim().length).toBeGreaterThan(100);
  });
});

describe('Context doc files existence and content', () => {
  test.each(ALL_CONTEXT_DOCS)('%s exists and is non-empty', (filename) => {
    const filepath = path.join(CONTEXT_DIR, filename);
    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content.trim().length).toBeGreaterThan(100);
  });
});

describe('DESIGN_SYSTEM.md content', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.join(SKILLS_DIR, 'DESIGN_SYSTEM.md'), 'utf-8');
  });

  test('lists Navbar component', () => expect(content).toContain('Navbar'));
  test('lists Hero components', () => expect(content).toContain('Hero'));
  test('lists ProductGrid component', () => expect(content).toContain('ProductGrid'));
  test('lists CartDrawer component', () => expect(content).toContain('CartDrawer'));
  test('lists Footer component', () => expect(content).toContain('Footer'));
});

describe('COMPONENTS.md content', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.join(SKILLS_DIR, 'COMPONENTS.md'), 'utf-8');
  });

  test('has props for Navbar', () => expect(content).toContain('Navbar'));
  test('has props for ProductGrid', () => expect(content).toContain('ProductGrid'));
  test('has props for CartDrawer', () => expect(content).toContain('CartDrawer'));
  test('has props for Hero', () => expect(content).toContain('Hero'));
});

describe('SECURITY_RULES.md prohibits backend technologies', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.join(CONTEXT_DIR, 'SECURITY_RULES.md'), 'utf-8');
  });

  test('prohibits Go/Fiber', () => expect(content).toContain('Fiber'));
  test('prohibits NestJS', () => expect(content).toContain('NestJS'));
  test('prohibits PostgreSQL', () => expect(content).toContain('PostgreSQL'));
  test('prohibits Terraform', () => expect(content).toContain('Terraform'));
});

describe('SDK_REFERENCE.md documents all hooks', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.join(CONTEXT_DIR, 'SDK_REFERENCE.md'), 'utf-8');
  });

  test('documents useProducts', () => expect(content).toContain('useProducts'));
  test('documents useProduct', () => expect(content).toContain('useProduct'));
  test('documents useCart', () => expect(content).toContain('useCart'));
  test('documents useStoreConfig', () => expect(content).toContain('useStoreConfig'));
  test('documents useOrderStatus', () => expect(content).toContain('useOrderStatus'));
});

describe('TEMPLATE_CATALOG.md lists all 5 templates', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.join(CONTEXT_DIR, 'TEMPLATE_CATALOG.md'), 'utf-8');
  });

  const templates = ['minimal', 'vibrant', 'elegant', 'urban', 'fresh'];

  test.each(templates)('lists template: %s', (template) => {
    expect(content).toContain(template);
  });
});
