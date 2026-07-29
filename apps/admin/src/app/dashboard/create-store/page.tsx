import { ChatAssistant } from '@/components/store-builder/ChatAssistant';

export const metadata = {
  title: 'Crear tienda con IA — GoShopping Admin',
  description: 'Crea tu tienda online en minutos con nuestro asistente de inteligencia artificial.',
};

export default function CreateStorePage() {
  // In a real setup this would come from the auth session
  const storeId = 'new-store';

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Crear tienda con IA</h1>
            <p className="text-sm text-gray-500">
              Respondé unas preguntas y tu tienda estará lista en minutos.
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <ChatAssistant storeId={storeId} />
      </div>
    </div>
  );
}
