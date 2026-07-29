import { GuardPipeline } from '../guards';
import { ClaudeClient } from './claude-client';
import { PartialStoreConfig } from './store-config-builder';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  storeId: string;
  messages: ChatMessage[];
  storeConfig: PartialStoreConfig;
  step: number;
  completed: boolean;
}

export interface ProcessMessageResult {
  response: string;
  storeConfig: PartialStoreConfig;
  step: number;
  completed: boolean;
  previewReady: boolean;
}

interface ChatStep {
  id: number;
  question: string;
  field: keyof PartialStoreConfig;
  required: boolean;
  options?: string[];
}

const CHAT_STEPS: ChatStep[] = [
  { id: 1, question: '¿Cómo se llama tu negocio?', field: 'name', required: true },
  {
    id: 2,
    question: '¿Qué vendes? Describe tu negocio en pocas palabras.',
    field: 'category',
    required: true,
  },
  {
    id: 3,
    question:
      '¿Qué colores representan tu marca? Puedes decirme nombres de colores o códigos hex.',
    field: 'colors',
    required: true,
  },
  {
    id: 4,
    question: '¿Qué estilo prefieres para tu tienda?',
    field: 'style',
    required: true,
    options: ['Minimalista', 'Vibrante', 'Elegante', 'Urbano', 'Fresco'],
  },
  {
    id: 5,
    question:
      '¿Tienes un logo? Si sí, súbelo aquí. Si no, podemos continuar sin él.',
    field: 'logo_url',
    required: false,
  },
  {
    id: 6,
    question: '¿Qué páginas necesitas además de inicio y catálogo?',
    field: 'pages',
    required: false,
    options: ['Sobre nosotros', 'Contacto', 'FAQ', 'Blog'],
  },
  {
    id: 7,
    question: '¿Tienes algún slogan o frase especial para tu marca?',
    field: 'tagline',
    required: false,
  },
];

const STYLE_MAP: Record<string, string> = {
  minimalista: 'minimal',
  minimal: 'minimal',
  vibrante: 'vibrant',
  vibrant: 'vibrant',
  elegante: 'elegant',
  elegant: 'elegant',
  urbano: 'urban',
  urban: 'urban',
  fresco: 'fresh',
  fresh: 'fresh',
};

const STYLE_RECOMMENDATIONS: Record<string, string> = {
  moda: 'Minimalista o Elegante',
  tecnologia: 'Vibrante',
  tecnología: 'Vibrante',
  alimentos: 'Fresco',
  joyeria: 'Elegante',
  joyería: 'Elegante',
  deportes: 'Vibrante o Urbano',
  hogar: 'Fresco o Minimalista',
  mascotas: 'Fresco',
  belleza: 'Elegante o Minimalista',
};

export class ChatService {
  private claude: ClaudeClient;
  private guards: GuardPipeline;
  private sessions: Map<string, ChatSession> = new Map();

  constructor(claude?: ClaudeClient) {
    this.claude = claude ?? new ClaudeClient();
    this.guards = new GuardPipeline();
  }

  createSession(storeId: string): ChatSession {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      storeId,
      messages: [],
      storeConfig: {},
      step: 0,
      completed: false,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async processMessage(sessionId: string, userMessage: string): Promise<ProcessMessageResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Guard: validate input
    const inputGuard = this.guards.validateInput(userMessage);
    if (inputGuard.blocked) {
      return {
        response: 'Lo siento, no pude procesar tu mensaje. ¿Podrías reformularlo?',
        storeConfig: session.storeConfig,
        step: session.step,
        completed: false,
        previewReady: false,
      };
    }

    session.messages.push({ role: 'user', content: userMessage });

    // Extract value for current step
    const currentStep = CHAT_STEPS[session.step];
    if (currentStep) {
      const extracted = await this.extractFieldValue(
        currentStep.field,
        userMessage,
        currentStep.options,
      );
      this.applyToConfig(session.storeConfig, currentStep.field, extracted);
      session.step++;
    }

    // Generate response
    const nextStep = CHAT_STEPS[session.step];
    let response: string;

    if (nextStep) {
      response = this.buildStepResponse(nextStep, session.storeConfig);
    } else {
      session.completed = true;
      response = this.buildCompletionResponse(session.storeConfig);
    }

    session.messages.push({ role: 'assistant', content: response });

    return {
      response,
      storeConfig: session.storeConfig,
      step: session.step,
      completed: session.completed,
      previewReady: session.completed,
    };
  }

  async extractFieldValue(
    field: keyof PartialStoreConfig,
    userMessage: string,
    _options?: string[],
  ): Promise<unknown> {
    if (field === 'name' || field === 'tagline') {
      return userMessage.trim();
    }

    if (field === 'category') {
      const prompt = `El usuario describe su negocio así: "${userMessage}". 
Clasifica en UNA de estas categorías: moda, tecnologia, alimentos, joyeria, deportes, hogar, mascotas, belleza, general.
Responde SOLO con la categoría, nada más.`;
      try {
        const result = await this.claude.generate({
          systemPrompt: 'Eres un clasificador. Responde solo con la categoría en minúsculas.',
          userMessage: prompt,
          maxTokens: 50,
          temperature: 0.1,
        });
        return result.trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, '');
      } catch {
        return 'general';
      }
    }

    if (field === 'colors') {
      const prompt = `El usuario quiere estos colores para su tienda: "${userMessage}".
Extrae el color primario y secundario. Responde SOLO en formato JSON:
{"primary": "HSL_VALUE", "secondary": "HSL_VALUE"}
Usa formato HSL sin "hsl()" — solo los valores numéricos: ejemplo "142 71% 45%"`;
      try {
        const result = await this.claude.generate({
          systemPrompt: 'Extrae colores. Responde solo JSON válido, sin texto adicional.',
          userMessage: prompt,
          maxTokens: 100,
          temperature: 0.1,
        });
        // Extract JSON from response
        const match = result.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : { primary: '142 71% 45%' };
      } catch {
        return { primary: '142 71% 45%' };
      }
    }

    if (field === 'style') {
      const lower = userMessage.toLowerCase().trim();
      return STYLE_MAP[lower] || 'minimal';
    }

    if (field === 'pages') {
      const pages = ['inicio', 'catalogo'];
      if (/nosotros|about/i.test(userMessage)) pages.push('about');
      if (/contacto|contact/i.test(userMessage)) pages.push('contact');
      if (/faq|preguntas/i.test(userMessage)) pages.push('faq');
      if (/blog/i.test(userMessage)) pages.push('blog');
      return pages;
    }

    if (field === 'logo_url') {
      return /^(no|sin|todav[ií]a no|ninguno)$/i.test(userMessage.trim()) ? null : userMessage.trim();
    }

    return userMessage.trim();
  }

  private applyToConfig(
    config: PartialStoreConfig,
    field: keyof PartialStoreConfig,
    value: unknown,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config as any)[field] = value;
  }

  private buildStepResponse(step: ChatStep, config: PartialStoreConfig): string {
    let response = step.question;

    if (step.options) {
      response += '\n\nOpciones: ' + step.options.join(', ');
    }

    if (step.field === 'style' && config.category) {
      const rec = STYLE_RECOMMENDATIONS[config.category];
      if (rec) {
        response += `\n\nPara tu tipo de negocio (${config.category}), te recomiendo: ${rec}`;
      }
    }

    return response;
  }

  private buildCompletionResponse(config: PartialStoreConfig): string {
    const pages = Array.isArray(config.pages) ? config.pages.join(', ') : 'inicio, catálogo';
    return [
      '¡Perfecto! Ya tengo toda la información que necesito para crear tu tienda.',
      '',
      'Resumen:',
      `- Nombre: ${config.name}`,
      `- Categoría: ${config.category}`,
      `- Estilo: ${config.style}`,
      `- Colores: ${JSON.stringify(config.colors)}`,
      `- Páginas: ${pages}`,
      config.tagline ? `- Slogan: ${config.tagline}` : null,
      '',
      '¿Quieres que genere tu tienda ahora? Haz clic en "Generar tienda" para ver el preview.',
    ]
      .filter((line) => line !== null)
      .join('\n');
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Exposed for testing */
  get chatSteps(): ChatStep[] {
    return CHAT_STEPS;
  }

  recommendStyle(category: string): string {
    return STYLE_RECOMMENDATIONS[category.toLowerCase()] || 'Minimalista';
  }
}
