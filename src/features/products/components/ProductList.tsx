import {
  useProducts,
  useProductCount,
  useTotalStock,
  useTotalValue,
} from '../store/productSelectors';
import { ProductRow } from './ProductRow';

export function ProductList() {
  const products = useProducts();
  const count = useProductCount();
  const totalStock = useTotalStock();
  const totalValue = useTotalValue();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm">No products yet. Add your first product!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-6 mb-5 text-sm">
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Total Products</span>
          <span className="font-semibold text-gray-800">{count}</span>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Total Stock</span>
          <span className="font-semibold text-gray-800">{totalStock}</span>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Total Value</span>
          <span className="font-semibold text-gray-800">Rp {totalValue.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
