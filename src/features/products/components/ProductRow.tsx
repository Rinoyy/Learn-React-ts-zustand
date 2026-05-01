import { useState } from 'react';
import { useProductActions } from '../store/productSelectors';
import type { Product } from '../types';

type Props = { product: Product };

export function ProductRow({ product }: Props) {
  const { updateProduct, deleteProduct } = useProductActions();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);

  const handleSave = () => {
    const updated = updateProduct({ id: product.id, name, price, stock });
    if (updated) setIsEditing(false);
  };

  const handleCancel = () => {
    setName(product.name);
    setPrice(product.price);
    setStock(product.stock);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm(`Yakin hapus "${product.name}"?`)) return;
    deleteProduct(product.id);
  };

  const inputClass = "w-full rounded-md border border-indigo-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  if (isEditing) {
    return (
      <tr className="bg-indigo-50">
        <td className="px-4 py-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </td>
        <td className="px-4 py-2">
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass + " text-right"} />
        </td>
        <td className="px-4 py-2">
          <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputClass + " text-right"} />
        </td>
        <td className="px-4 py-2">
          <div className="flex justify-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Simpan
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md bg-white border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
      <td className="px-4 py-3 text-right text-gray-600">Rp {product.price.toLocaleString('id-ID')}</td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.stock === 0 ? 'bg-red-100 text-red-700' : product.stock < 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {product.stock}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}
