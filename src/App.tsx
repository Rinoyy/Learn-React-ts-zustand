import { ProductForm } from './features/products/components/ProductForm';
import { ProductList } from './features/products/components/ProductList';
import { ErrorBanner } from './features/products/components/ErrorBanner';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Product Manager</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <ErrorBanner />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tambah Product</h2>
          <ProductForm />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Daftar Product</h2>
          <ProductList />
        </div>
      </main>
    </div>
  );
}

export default App;
