import * as fs from 'fs';
import * as path from 'path';

export interface PromptContext {
  skills: string[];
  contextDocs: string[];
  storeConfig?: {
    name: string;
    category: string;
    style: string;
    template: string;
    colors?: { primary?: string; secondary?: string; accent?: string };
    tagline?: string;
  };
  requestType: 'store' | 'component' | 'style';
}

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const CONTEXT_DIR = path.join(__dirname, '..', 'context');

export class SystemPromptBuilder {
  private skillsDir: string;
  private contextDir: string;

  constructor(skillsDir = SKILLS_DIR, contextDir = CONTEXT_DIR) {
    this.skillsDir = skillsDir;
    this.contextDir = contextDir;
  }

  loadSkill(name: string): string {
    const filePath = path.join(this.skillsDir, `${name}.md`);
    return fs.readFileSync(filePath, 'utf-8');
  }

  loadContext(name: string): string {
    const filePath = path.join(this.contextDir, `${name}.md`);
    return fs.readFileSync(filePath, 'utf-8');
  }

  selectSkills(requestType: 'store' | 'component' | 'style'): string[] {
    const base = ['DESIGN_SYSTEM', 'COMPONENTS', 'RESPONSIVE', 'ACCESSIBILITY'];

    if (requestType === 'store') {
      return [...base, 'LAYOUT', 'ECOMMERCE_UX', 'SEO', 'COLOR_ENGINE', 'TYPOGRAPHY'];
    }

    if (requestType === 'component') {
      return [...base, 'ECOMMERCE_UX'];
    }

    // style
    return ['COLOR_ENGINE', 'TYPOGRAPHY', 'DESIGN_SYSTEM'];
  }

  selectContextDocs(requestType: 'store' | 'component' | 'style'): string[] {
    // SECURITY_RULES is always included, always first
    const base = ['SECURITY_RULES', 'SDK_REFERENCE', 'API_REFERENCE'];

    if (requestType === 'store') {
      return [...base, 'TEMPLATE_CATALOG'];
    }

    return base;
  }

  buildSystemPrompt(context: PromptContext): string {
    const parts: string[] = [];

    // 1. Context docs first — SECURITY_RULES must be first
    for (const docName of context.contextDocs) {
      parts.push(this.loadContext(docName));
    }

    // 2. Skills
    for (const skillName of context.skills) {
      parts.push(this.loadSkill(skillName));
    }

    // 3. Store config block (optional)
    if (context.storeConfig) {
      const { name, category, style, template, colors, tagline } = context.storeConfig;
      parts.push(
        [
          '## Configuración de la tienda a generar',
          '',
          `- **Nombre**: ${name}`,
          `- **Categoría**: ${category}`,
          `- **Estilo**: ${style}`,
          `- **Template**: ${template}`,
          tagline ? `- **Tagline**: ${tagline}` : null,
          colors?.primary ? `- **Color primario**: ${colors.primary}` : null,
          colors?.secondary ? `- **Color secundario**: ${colors.secondary}` : null,
          colors?.accent ? `- **Color acento**: ${colors.accent}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    // 4. Role and goal
    parts.push(
      [
        '## Tu rol',
        '',
        'Eres un experto en Next.js, React, TypeScript y Tailwind CSS especializado en e-commerce.',
        'Generas código React/TypeScript limpio, accesible y listo para producción.',
        'Usas EXCLUSIVAMENTE los componentes del design system de GoShopping y el storefront-sdk.',
        'NUNCA generas código de backend, base de datos, infraestructura o lógica de servidor.',
      ].join('\n'),
    );

    return parts.join('\n\n---\n\n');
  }
}
