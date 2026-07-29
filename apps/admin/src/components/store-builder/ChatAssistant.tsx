'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { StyleSelector } from './StyleSelector';
import { ColorPicker } from './ColorPicker';
import { StoreConfigSummary } from './StoreConfigSummary';
import { GenerationProgress } from './GenerationProgress';
import { StorePreview } from './StorePreview';

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? 'http://localhost:3002';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PartialStoreConfig {
  name?: string;
  category?: string;
  style?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  tagline?: string;
  logo_url?: string | null;
  pages?: string[];
}

interface ChatAssistantProps {
  storeId: string;
}

export function ChatAssistant({ storeId }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [storeConfig, setStoreConfig] = useState<PartialStoreConfig>({});
  const [isLoading, setIsLoading] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genTotal] = useState(4);
  const [generationDone, setGenerationDone] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [isPublishing, setIsPublishing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await fetch(`${AI_ENGINE_URL}/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: storeId }),
        });
        const data = await res.json();
        setSessionId(data.session_id);
        setMessages([{ role: 'assistant', content: data.response }]);
        setCurrentStep(data.step ?? 0);
      } catch {
        setMessages([
          {
            role: 'assistant',
            content:
              'Hola! Parece que hubo un problema de conexión. Por favor, recarga la página.',
          },
        ]);
      }
    };
    createSession();
  }, [storeId]);

  const sendMessage = useCallback(
    async (messageText?: string) => {
      const text = messageText ?? inputValue.trim();
      if (!text || !sessionId || isLoading) return;

      setInputValue('');
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      try {
        const res = await fetch(`${AI_ENGINE_URL}/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();

        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
        setCurrentStep(data.step);
        setStoreConfig(data.store_config ?? {});

        if (data.completed) {
          setCompleted(true);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, sessionId, isLoading],
  );

  const handleGenerate = async () => {
    if (!sessionId || isGenerating) return;
    setIsGenerating(true);
    setGenStep(1);

    // Slugify store name for the request
    const storeSlug =
      (storeConfig.name ?? 'mi-tienda')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    try {
      // Progress simulation while waiting for the API
      const progressTimer = setInterval(() => {
        setGenStep((prev) => (prev < genTotal - 1 ? prev + 1 : prev));
      }, 1200);

      const res = await fetch(`${AI_ENGINE_URL}/generate/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? ''}`,
        },
        body: JSON.stringify({
          store_config: storeConfig,
          store_slug: storeSlug,
          store_id: storeId,
        }),
      });

      clearInterval(progressTimer);

      const data = await res.json();
      setGenStep(genTotal);
      setPreviewUrl(data.preview_url);
    } catch {
      // Even on error, mark as done so user can retry
    } finally {
      setIsGenerating(false);
      setGenerationDone(true);
    }
  };

  const handleViewPreview = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
    setShowPreview(true);
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    const storeSlug =
      (storeConfig.name ?? 'mi-tienda')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    try {
      const res = await fetch(`${AI_ENGINE_URL}/generate/store/${storeSlug}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? ''}`,
        },
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // noop — user can retry
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRegenerate = () => {
    setGenerationDone(false);
    setIsGenerating(false);
    setGenStep(0);
    setPreviewUrl(undefined);
    setShowPreview(false);
  };

  // Determine which step requires the special UI component
  // Steps: 0=name, 1=category, 2=colors, 3=style, 4=logo_url, 5=pages, 6=tagline
  const showStyleSelector = currentStep === 3;
  const showColorPicker = currentStep === 2;

  const STEPS = ['name', 'category', 'colors', 'style', 'logo_url', 'pages', 'tagline'];
  const currentField = STEPS[currentStep];

  return (
    <div className="flex h-full gap-6" data-testid="chat-assistant">
      {/* Left panel: chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-1 pb-4">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          {/* Inline components for specific steps */}
          {showStyleSelector && !isLoading && (
            <div className="px-2">
              <StyleSelector
                selected={storeConfig.style}
                onSelect={(style) => {
                  sendMessage(style);
                }}
              />
            </div>
          )}

          {showColorPicker && !isLoading && (
            <div className="px-2">
              <ColorPicker
                category={storeConfig.category}
                onSelect={(colors) => {
                  sendMessage(
                    `Color primario: ${colors.primary}${colors.secondary ? `, secundario: ${colors.secondary}` : ''}`,
                  );
                }}
              />
            </div>
          )}

          {/* Summary + generate button when completed */}
          {completed && !isGenerating && !generationDone && (
            <div className="px-2 space-y-3" data-testid="completion-section">
              <StoreConfigSummary config={storeConfig} />
              <button
                onClick={handleGenerate}
                className="w-full py-3 bg-brand-700 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
                data-testid="generate-btn"
              >
                ✨ Generar tienda
              </button>
            </div>
          )}

          {/* Generation progress */}
          {(isGenerating || generationDone) && (
            <div className="px-2">
              <GenerationProgress
                isGenerating={isGenerating}
                currentStep={genStep}
                totalSteps={genTotal}
                completed={generationDone}
                previewUrl={previewUrl}
                onViewPreview={handleViewPreview}
                onPublish={handlePublish}
                onRegenerate={handleRegenerate}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {!completed && (
          <div className="pt-3 border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  currentField === 'logo_url'
                    ? 'URL de tu logo o escribe "no"...'
                    : 'Escribe tu respuesta...'
                }
                disabled={isLoading || showStyleSelector || showColorPicker}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="chat-input"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || showStyleSelector || showColorPicker}
                className="px-4 py-2.5 bg-brand-700 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                →
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right panel: preview */}
      <div className="w-[45%] flex-shrink-0 hidden lg:block">
        <StorePreview storeConfig={storeConfig} loading={isGenerating} />
      </div>
    </div>
  );
}
