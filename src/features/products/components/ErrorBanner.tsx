import { useProductError, useProductActions } from '../store/productSelectors';

export function ErrorBanner() {
  const error = useProductError();
  const { clearError } = useProductActions();

  if (!error) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>{error}</span>
      </div>
      <button
        onClick={clearError}
        className="shrink-0 text-red-400 hover:text-red-600 transition-colors cursor-pointer font-bold text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
