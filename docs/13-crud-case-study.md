# Case Study: CRUD Products

> Gabungan semua konsep dalam satu mini-aplikasi nyata. Manajemen produk dengan create, read, update, delete — data disimpan di localStorage, tanpa backend.

---

## Gambaran Umum

**Yang dibangun:** aplikasi manajemen produk sederhana.
**Fitur:** tambah produk, lihat daftar, edit, hapus.
**Penyimpanan:** localStorage lewat `persist` — data tetap ada setelah refresh.
**Stack:** React + TypeScript + Zustand.

**Kenapa tanpa backend?** Supaya kamu fokus ke konsep state management. Struktur kodenya tetap **migration-ready** — kalau nanti ada backend, hanya layer store yang perlu diubah, komponen UI tidak perlu disentuh.

---

## Struktur Folder

```
src/
├── features/
│   └── products/
│       ├── types.ts
│       ├── utils.ts
│       ├── store/
│       │   ├── productStore.ts
│       │   └── productSelectors.ts
│       ├── components/
│       │   ├── ProductList.tsx
│       │   ├── ProductRow.tsx
│       │   ├── ProductForm.tsx
│       │   └── ErrorBanner.tsx
│       └── index.ts
└── App.tsx
```

---

## Langkah 1 — Types

```ts
// src/features/products/types.ts

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

// Input untuk buat produk baru — tanpa id, createdAt, updatedAt (di-generate otomatis)
export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

// Input untuk update — semua field opsional kecuali id
export type UpdateProductInput = Partial<CreateProductInput> & { id: string };
```

`Omit` dan `Partial` adalah utility type TypeScript:
- `Omit<Product, 'id' | ...>` = semua field Product **kecuali** yang disebutkan
- `Partial<CreateProductInput>` = semua field jadi opsional (boleh tidak diisi)

---

## Langkah 2 — Utility

```ts
// src/features/products/utils.ts

// ID generator — di production gunakan crypto.randomUUID() atau library nanoid
export const generateId = (): string =>
  `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
```

Kenapa pisahkan utils? Supaya bisa di-test secara terpisah dan dipakai di tempat lain tanpa harus import seluruh store.

---

## Langkah 3 — Store

Ini inti dari aplikasi. Store menangani semua operasi CRUD, validasi, dan penyimpanan ke localStorage.

```ts
// src/features/products/store/productStore.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../utils';
import type { Product, CreateProductInput, UpdateProductInput } from '../types';

type ProductState = {
  products: Product[];
  error: string | null;

  createProduct: (input: CreateProductInput) => Product | null;
  updateProduct: (input: UpdateProductInput) => Product | null;
  deleteProduct: (id: string) => boolean;
  clearError: () => void;
  resetAll: () => void;
};

// Validasi dipisah dari action — reusable, testable
const validateProduct = (input: CreateProductInput): string | null => {
  if (!input.name.trim()) return 'Nama produk tidak boleh kosong';
  if (input.name.length > 100) return 'Nama maksimal 100 karakter';
  if (input.price < 0) return 'Harga tidak boleh negatif';
  if (input.stock < 0) return 'Stok tidak boleh negatif';
  if (!Number.isInteger(input.stock)) return 'Stok harus bilangan bulat';
  return null;
};

export const useProductStore = create<ProductState>()(
  devtools(
    persist(
      (set, get) => ({
        products: [],
        error: null,

        createProduct: (input) => {
          const error = validateProduct(input);
          if (error) {
            set({ error }, false, 'products/create/validation-error');
            return null;
          }

          const now = new Date().toISOString();
          const product: Product = {
            id: generateId(),
            ...input,
            createdAt: now,
            updatedAt: now,
          };

          set(
            (state) => ({ products: [...state.products, product], error: null }),
            false,
            'products/create/success'
          );
          return product;
        },

        updateProduct: ({ id, ...input }) => {
          const existing = get().products.find((p) => p.id === id);
          if (!existing) {
            set({ error: 'Produk tidak ditemukan' }, false, 'products/update/not-found');
            return null;
          }

          // Gabung data lama + perubahan baru, lalu validasi hasilnya
          const merged = { ...existing, ...input };
          const error = validateProduct({
            name: merged.name,
            price: merged.price,
            stock: merged.stock,
          });
          if (error) {
            set({ error }, false, 'products/update/validation-error');
            return null;
          }

          const updated: Product = { ...merged, updatedAt: new Date().toISOString() };
          set(
            (state) => ({
              products: state.products.map((p) => (p.id === id ? updated : p)),
              error: null,
            }),
            false,
            'products/update/success'
          );
          return updated;
        },

        deleteProduct: (id) => {
          const exists = get().products.some((p) => p.id === id);
          if (!exists) {
            set({ error: 'Produk tidak ditemukan' }, false, 'products/delete/not-found');
            return false;
          }
          set(
            (state) => ({
              products: state.products.filter((p) => p.id !== id),
              error: null,
            }),
            false,
            'products/delete/success'
          );
          return true;
        },

        clearError: () => set({ error: null }, false, 'products/clear-error'),

        resetAll: () =>
          set({ products: [], error: null }, false, 'products/reset-all'),
      }),
      {
        name: 'product-storage',
        storage: createJSONStorage(() => localStorage),
        version: 1,
        partialize: (state) => ({ products: state.products }),
        // error tidak di-persist — tidak relevan setelah refresh
      }
    ),
    { name: 'ProductStore' }
  )
);
```

**Poin penting di store ini:**

1. **Action tidak `async`** — localStorage itu sinkron. Tidak perlu `isLoading`.
2. **Validasi di luar action** — fungsi `validateProduct` berdiri sendiri, dipakai oleh create dan update. Tidak duplikasi.
3. **`partialize`** — hanya `products` yang disimpan. `error` tidak di-persist karena error lama tidak relevan setelah refresh.
4. **Action return value** — sukses return data, gagal return `null`/`false`. Komponen bisa cek hasil tanpa harus subscribe ke `error`.
5. **`version: 1`** — siap untuk migrasi kalau struktur berubah.
6. **DevTools naming** — setiap `set` punya label, mudah di-trace di browser.

---

## Langkah 4 — Selectors

```ts
// src/features/products/store/productSelectors.ts
import { useProductStore } from './productStore';
import { useShallow } from 'zustand/react/shallow';
import type { Product } from '../types';

// Selector dasar
export const useProducts = () => useProductStore((s) => s.products);
export const useProductError = () => useProductStore((s) => s.error);

// Computed — dihitung dari state, tidak disimpan di store
export const useProductById = (id: string): Product | undefined =>
  useProductStore((s) => s.products.find((p) => p.id === id));

export const useProductCount = () =>
  useProductStore((s) => s.products.length);

export const useTotalStock = () =>
  useProductStore((s) => s.products.reduce((sum, p) => sum + p.stock, 0));

export const useTotalValue = () =>
  useProductStore((s) => s.products.reduce((sum, p) => sum + p.price * p.stock, 0));

// Group action — komponen cukup satu hook untuk semua action
export const useProductActions = () =>
  useProductStore(
    useShallow((s) => ({
      createProduct: s.createProduct,
      updateProduct: s.updateProduct,
      deleteProduct: s.deleteProduct,
      clearError: s.clearError,
    }))
  );
```

Dengan selector terpisah, komponen tidak perlu tahu bentuk store. Kalau struktur store berubah, cukup update selector.

---

## Langkah 5 — Komponen

### ProductForm — Form tambah produk baru

```tsx
// src/features/products/components/ProductForm.tsx
import { useState, FormEvent } from 'react';
import { useProductActions } from '../store/productSelectors';

export function ProductForm() {
  const { createProduct } = useProductActions();
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const result = createProduct({
      name: name.trim(),
      price: typeof price === 'number' ? price : 0,
      stock: typeof stock === 'number' ? stock : 0,
    });

    if (result) {
      // Berhasil — reset form
      setName('');
      setPrice('');
      setStock('');
    }
    // Gagal — error tersimpan di store, ErrorBanner yang menampilkannya
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama produk"
        required
        style={{ flex: 2 }}
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="Harga"
        min={0}
        required
        style={{ flex: 1 }}
      />
      <input
        type="number"
        value={stock}
        onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="Stok"
        min={0}
        required
        style={{ flex: 1 }}
      />
      <button type="submit">Tambah</button>
    </form>
  );
}
```

### ErrorBanner — Tampilkan error dari store

```tsx
// src/features/products/components/ErrorBanner.tsx
import { useProductError, useProductActions } from '../store/productSelectors';

export function ErrorBanner() {
  const error = useProductError();
  const { clearError } = useProductActions();

  if (!error) return null;

  return (
    <div style={{
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      backgroundColor: '#fee2e2',
      border: '1px solid #fca5a5',
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span>⚠️ {error}</span>
      <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
    </div>
  );
}
```

### ProductRow — Satu baris produk dengan inline edit

```tsx
// src/features/products/components/ProductRow.tsx
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
    const result = updateProduct({ id: product.id, name, price, stock });
    if (result) setIsEditing(false);
    // Kalau gagal, store sudah set error — ErrorBanner akan menampilkannya
  };

  const handleCancel = () => {
    // Reset ke nilai asal
    setName(product.name);
    setPrice(product.price);
    setStock(product.stock);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm(`Hapus "${product.name}"?`)) return;
    deleteProduct(product.id);
  };

  if (isEditing) {
    return (
      <tr>
        <td>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
        </td>
        <td>
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
            style={{ width: '100%', textAlign: 'right' }} />
        </td>
        <td>
          <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))}
            style={{ width: '100%', textAlign: 'right' }} />
        </td>
        <td>
          <button onClick={handleSave}>Simpan</button>
          <button onClick={handleCancel} style={{ marginLeft: '0.25rem' }}>Batal</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{product.name}</td>
      <td style={{ textAlign: 'right' }}>Rp {product.price.toLocaleString('id-ID')}</td>
      <td style={{ textAlign: 'right' }}>{product.stock}</td>
      <td>
        <button onClick={() => setIsEditing(true)}>Edit</button>
        <button onClick={handleDelete} style={{ marginLeft: '0.25rem' }}>Hapus</button>
      </td>
    </tr>
  );
}
```

### ProductList — Daftar semua produk + statistik

```tsx
// src/features/products/components/ProductList.tsx
import {
  useProducts, useProductCount, useTotalStock, useTotalValue
} from '../store/productSelectors';
import { ProductRow } from './ProductRow';

export function ProductList() {
  const products = useProducts();
  const count = useProductCount();
  const totalStock = useTotalStock();
  const totalValue = useTotalValue();

  if (products.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        Belum ada produk. Tambah produk pertama kamu di atas!
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
        {count} produk · {totalStock} unit stok · nilai Rp {totalValue.toLocaleString('id-ID')}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Nama</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Harga</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Stok</th>
            <th style={{ padding: '0.5rem' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

> Perhatikan: tidak ada `useEffect` untuk memuat data. `persist` otomatis mengisi store dari localStorage saat aplikasi dibuka.

---

## Langkah 6 — Public API dan App

```ts
// src/features/products/index.ts
// Hanya ekspor yang dibutuhkan dari luar feature ini
export { ProductList } from './components/ProductList';
export { ProductForm } from './components/ProductForm';
export { ErrorBanner } from './components/ErrorBanner';
export type { Product } from './types';
```

```tsx
// src/App.tsx
import { ProductList, ProductForm, ErrorBanner } from './features/products';

export default function App() {
  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
      <h1>Manajemen Produk</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Data tersimpan otomatis di browser (localStorage).
      </p>

      <ErrorBanner />
      <ProductForm />
      <ProductList />
    </div>
  );
}
```

---

## Bonus: Migrasi Schema saat Struktur Data Berubah

Kalau kamu sudah deploy dan user punya data lama, mengubah struktur `Product` bisa merusak data mereka. Tangani dengan versioning:

```ts
// Misal: versi 2 menambah field "category"
persist(
  (set, get) => ({ ... }),
  {
    name: 'product-storage',
    version: 2,  // naikkan dari 1 ke 2
    migrate: (persistedState: any, fromVersion: number) => {
      if (fromVersion === 1) {
        persistedState.products = persistedState.products.map((p: any) => ({
          ...p,
          category: 'Uncategorized',  // default untuk produk lama
        }));
      }
      return persistedState;
    },
  }
)
```

---

## Bonus: Export & Import Data (Backup Manual)

Tanpa backend, user tidak bisa backup datanya ke cloud. Berikan kemampuan export/import:

```ts
// Tambahkan ke store actions:
exportData: (): string => {
  const { products } = get();
  return JSON.stringify({ products, exportedAt: new Date().toISOString() }, null, 2);
},

importData: (json: string): boolean => {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data.products)) {
      set({ error: 'Format data tidak valid' });
      return false;
    }
    set({ products: data.products, error: null });
    return true;
  } catch {
    set({ error: 'File bukan JSON yang valid' });
    return false;
  }
},
```

---

## Kalau Suatu Saat Butuh Backend

Karena kode sudah feature-based dan selector terpisah dari komponen, migrasi ke backend hanya butuh perubahan di **store layer**. Komponen UI tidak berubah sama sekali.

Yang perlu dilakukan:
1. Buat folder `api/` + file `productApi.ts` berisi fungsi fetch ke endpoint nyata
2. Ubah action di store jadi `async`, tambahkan `status` enum
3. Hapus middleware `persist` (atau ubah jadi cache-only)
4. Selector, komponen, dan `index.ts` tetap sama

Ini adalah keuntungan nyata dari separation of concerns: ketika requirement berubah, dampaknya terisolasi di layer yang tepat.
