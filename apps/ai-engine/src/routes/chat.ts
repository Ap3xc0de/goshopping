import { Request, Response, Router } from 'express';
import { ChatService } from '../services/chat-service';
import { StoreConfigBuilder } from '../services/store-config-builder';

export const chatRouter = Router();

const chatService = new ChatService();
const configBuilder = new StoreConfigBuilder();

// POST /chat/sessions — Create a new chat session
chatRouter.post('/sessions', (req: Request, res: Response) => {
  const { store_id } = req.body as { store_id?: string };
  if (!store_id) {
    return res.status(400).json({ error: 'store_id is required' });
  }

  const session = chatService.createSession(store_id);

  // Send initial greeting
  const greeting =
    '¡Hola! Soy tu asistente de GoShopping. Voy a ayudarte a crear tu tienda en minutos. 🛍️\n\n¿Cómo se llama tu negocio?';
  session.messages.push({ role: 'assistant', content: greeting });

  return res.status(201).json({
    session_id: session.id,
    response: greeting,
    step: 0,
    completed: false,
  });
});

// POST /chat/sessions/:sessionId/messages — Send a message in an existing session
chatRouter.post('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const result = await chatService.processMessage(sessionId, message.trim());

    const response: Record<string, unknown> = {
      response: result.response,
      step: result.step,
      completed: result.completed,
      preview_ready: result.previewReady,
      store_config: result.storeConfig,
    };

    // If completed, include the final built config
    if (result.completed) {
      response.built_config = configBuilder.build(result.storeConfig);
    }

    return res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Session not found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    console.error('[ChatRoute] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chat/sessions/:sessionId — Get session state
chatRouter.get('/sessions/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = chatService.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({ session });
});
