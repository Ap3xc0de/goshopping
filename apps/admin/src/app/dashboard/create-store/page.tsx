import { CreateStoreWizard } from '@/components/store-builder/CreateStoreWizard';

export const metadata = {
  title: 'Crear tienda — GoShopping Admin',
  description: 'Personalizá tu marca y tu tienda estará lista en minutos.',
};

export default function CreateStorePage() {
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-64px)] overflow-y-auto">
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
            <h1 className="text-lg font-bold text-gray-900">Crear tienda</h1>
            <p className="text-sm text-gray-500">
              Personalizá tu marca y publicá en minutos.
            </p>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <div className="flex-1 px-6 py-6">
        <CreateStoreWizard />
      </div>
    </div>
  );
}
