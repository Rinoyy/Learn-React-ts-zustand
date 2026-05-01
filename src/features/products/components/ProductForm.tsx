import { useState } from 'react';
import { useProductActions } from '../store/productSelectors';

export function ProductForm() {
  const { createProduct } = useProductActions();
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();

    const created = createProduct({
      name: name.trim(),
      price: typeof price === 'number' ? price : 0,
      stock: typeof stock === 'number' ? stock : 0,
    });

    if (created) {
      setName('');
      setPrice('');
      setStock('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap sm:flex-nowrap">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama product"
        required
        className="flex-2 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="Harga"
        min={0}
        required
        className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <input
        type="number"
        value={stock}
        onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="Stok"
        min={0}
        required
        className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
      >
        + Tambah
      </button>
    </form>
  );
}
