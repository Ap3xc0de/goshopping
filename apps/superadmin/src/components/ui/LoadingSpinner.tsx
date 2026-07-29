export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center p-4">
      <div
        role="status"
        aria-label="Cargando"
        className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-200 border-t-brand-600`}
      />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
