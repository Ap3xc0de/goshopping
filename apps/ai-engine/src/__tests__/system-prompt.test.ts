import * as path from 'path';
import { SystemPromptBuilder } from '../prompts/system-prompt';

const builder = new SystemPromptBuilder(
  path.join(__dirname, '../skills'),
  path.join(__dirname, '../context'),
);

describe('SystemPromptBuilder', () => {
  describe('loadSkill', () => {
    const allSkills = [
      'LAYOUT',
      'DESIGN_SYSTEM',
      'COMPONENTS',
      'COLOR_ENGINE',
      'TYPOGRAPHY',
      'SEO',
      'ACCESSIBILITY',
      'RESPONSIVE',
      'ECOMMERCE_UX',
    ];

    test.each(allSkills)('loads %s without error', (skill) => {
      const content = builder.loadSkill(skill);
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('loadContext', () => {
    const allContextDocs = [
      'API_REFERENCE',
      'SDK_REFERENCE',
      'SECURITY_RULES',
      'TEMPLATE_CATALOG',
    ];

    test.each(allContextDocs)('loads %s without error', (doc) => {
      const content = builder.loadContext(doc);
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('buildSystemPrompt', () => {
    test('always includes SECURITY_RULES content', () => {
      const prompt = builder.buildSystemPrompt({
        skills: ['DESIGN_SYSTEM'],
        contextDocs: ['SECURITY_RULES'],
        requestType: 'component',
      });

      expect(prompt).toContain('NUNCA');
    });

    test('includes store config when provided', () => {
      const prompt = builder.buildSystemPrompt({
        skills: ['DESIGN_SYSTEM'],
        contextDocs: ['SECURITY_RULES'],
        requestType: 'store',
        storeConfig: {
          name: 'Mi Tienda Test',
          category: 'Moda',
          style: 'vibrant',
          template: 'vibrant',
        },
      });

      expect(prompt).toContain('Mi Tienda Test');
      expect(prompt).toContain('Moda');
    });

    test('includes role definition with restrictions', () => {
      const prompt = builder.buildSystemPrompt({
        skills: builder.selectSkills('store'),
        contextDocs: builder.selectContextDocs('store'),
        requestType: 'store',
      });

      // The role section appended by the builder should define restrictions
      expect(prompt).toContain('Tu rol');
      expect(prompt).toContain('EXCLUSIVAMENTE');
    });

    test('instructs to use storefront-sdk', () => {
      const prompt = builder.buildSystemPrompt({
        skills: builder.selectSkills('store'),
        contextDocs: builder.selectContextDocs('store'),
        requestType: 'store',
      });

      expect(prompt).toContain('storefront-sdk');
    });
  });

  describe('selectSkills', () => {
    test('returns base skills for "component" type', () => {
      const skills = builder.selectSkills('component');
      expect(skills).toContain('DESIGN_SYSTEM');
      expect(skills).toContain('COMPONENTS');
      expect(skills).toContain('RESPONSIVE');
      expect(skills).toContain('ACCESSIBILITY');
    });

    test('returns all skills for "store" type', () => {
      const skills = builder.selectSkills('store');
      expect(skills).toContain('LAYOUT');
      expect(skills).toContain('ECOMMERCE_UX');
      expect(skills).toContain('SEO');
      expect(skills).toContain('COLOR_ENGINE');
      expect(skills).toContain('TYPOGRAPHY');
    });

    test('returns minimal skills for "style" type', () => {
      const skills = builder.selectSkills('style');
      expect(skills).toContain('COLOR_ENGINE');
      expect(skills).toContain('TYPOGRAPHY');
      expect(skills).not.toContain('LAYOUT');
      expect(skills).not.toContain('SEO');
    });
  });

  describe('selectContextDocs', () => {
    test('always includes SECURITY_RULES for any request type', () => {
      const types: Array<'store' | 'component' | 'style'> = ['store', 'component', 'style'];
      for (const type of types) {
        const docs = builder.selectContextDocs(type);
        expect(docs[0]).toBe('SECURITY_RULES');
      }
    });

    test('includes TEMPLATE_CATALOG only for "store" type', () => {
      expect(builder.selectContextDocs('store')).toContain('TEMPLATE_CATALOG');
      expect(builder.selectContextDocs('component')).not.toContain('TEMPLATE_CATALOG');
      expect(builder.selectContextDocs('style')).not.toContain('TEMPLATE_CATALOG');
    });
  });
});
