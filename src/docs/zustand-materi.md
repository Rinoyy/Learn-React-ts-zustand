# Belajar Zustand: Dari Nol Sampai Production-Ready

> Kurikulum lengkap React + TypeScript + Zustand
> Dirancang bertahap, dari fundamental sampai arsitektur scalable

---

## Daftar Isi

1. [Fundamental](#1-fundamental)
2. [Basic Usage](#2-basic-usage)
3. [Intermediate](#3-intermediate)
4. [Advanced](#4-advanced)
5. [Real Case Study: CRUD Products](#5-real-case-study-crud-products)
6. [Best Practices & Anti-Patterns](#6-best-practices--anti-patterns)

---

## 1. Fundamental

### 1.1 Apa itu Zustand?

Zustand (bahasa Jerman, artinya "state" atau "kondisi") adalah **state management library** untuk React yang super ringan (~1KB). Dibuat oleh tim yang sama yang bikin React Three Fiber dan Jotai.

**Filosofinya:** *"Bears don't care about boilerplate"* — fokus ke menulis logic, bukan setup.

### 1.2 Kenapa Zustand? (vs Context API vs Redux)

Mari kita bandingkan ketiganya secara jujur:

| Aspek | Context API | Redux Toolkit | Zustand |
|---|---|---|---|
| Boilerplate | Sedang | Banyak | Minim |
| Learning curve | Mudah | Curam | Mudah |
| Performance default | ❌ Re-render semua consumer | ✅ Optimized | ✅ Optimized |
| DevTools | ❌ Manual | ✅ Powerful | ✅ Built-in |
| Async handling | Manual | RTK Query / Thunk | Native (langsung di action) |
| Bundle size | 0 (built-in) | ~13KB | ~1KB |
| TypeScript support | OK | Baik | Sangat baik |
| Cocok untuk | State kecil, theming | App enterprise besar | **Kebanyakan kasus** |

**Kapan pilih Zustand?**
- Lo butuh global state tanpa ribet provider hell
- Lo udah pernah kena masalah Context API yang bikin re-render dimana-mana
- Lo butuh sesuatu yang bisa di-scale tapi gak mau setup Redux yang panjang

**Konkretnya, masalah Context API yang Zustand solve:**

```tsx
// ❌ Context API: setiap kali state berubah, SEMUA consumer re-render
// Walaupun yang berubah cuma 1 field dari 10 field
const AppContext = createContext({ user: null, theme: 'light', cart: [] });

// Component yang cuma butuh "theme" tetap re-render kalau "cart" berubah
function ThemeButton() {
  const { theme } = useContext(AppContext); // re-render saat cart berubah!
  return <button>{theme}</button>;
}
```

```tsx
// ✅ Zustand: re-render cuma terjadi kalau field yang dipilih berubah
const ThemeButton = () => {
  const theme = useStore((state) => state.theme); // gak re-render saat cart berubah
  return <button>{theme}</button>;
};
```

### 1.3 Konsep Dasar: Store, State, Action

Tiga konsep ini wajib lo pahami sebelum lanjut:

- **Store** → "rumah" tempat state disimpan. Satu store bisa berisi banyak state.
- **State** → data itu sendiri (misal: `count: 0`, `user: { name: 'Andi' }`).
- **Action** → fungsi yang **mengubah** state.

Analogi sederhana:
- Store = dompet
- State = isi dompet (uang, kartu, KTP)
- Action = tindakan (ambil uang, tambah uang, pindah kartu)

### 1.4 Store Pertama Lo dengan TypeScript

Install dulu:

```bash
npm install zustand
```

Store paling sederhana — counter:

```ts
// src/store/counterStore.ts
import { create } from 'zustand';

// 1. Definisikan TYPE dari state + action
type CounterState = {
  count: number;        // state
  increment: () => void; // action
  decrement: () => void;
  reset: () => void;
};

// 2. Buat store
export const useCounterStore = create<CounterState>((set) => ({
  // initial state
  count: 0,

  // actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

**Bedah baris per baris:**

- `create<CounterState>` → bikin hook bernama `useCounterStore` dengan type yang jelas
- `(set) => ({...})` → callback yang nerima fungsi `set` untuk update state
- `set((state) => ({ count: state.count + 1 }))` → update berbasis state lama (fungsi)
- `set({ count: 0 })` → update langsung (object literal)

> **Penting:** `set` itu **merge**, bukan replace. Jadi kalau lo cuma `set({ count: 0 })`, field lain di state gak akan hilang. Ini beda sama `useState` di React.

---

## 2. Basic Usage

### 2.1 Membaca dan Update State di Komponen

Pakai store di komponen:

```tsx
// src/components/Counter.tsx
import { useCounterStore } from '../store/counterStore';

export function Counter() {
  // Cara 1: ambil 1 field (RECOMMENDED — ini yang efisien)
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

**Anti-pattern:** jangan ambil seluruh state sekaligus.

```tsx
// ❌ JELEK: re-render setiap kali field MANAPUN di store berubah
const { count, increment } = useCounterStore();

// ✅ BAGUS: re-render cuma kalau "count" atau "increment" berubah
const count = useCounterStore((state) => state.count);
const increment = useCounterStore((state) => state.increment);
```

> Kebiasaan ini gua sebut **selector pattern** — selalu pilih spesifik apa yang lo butuh.

### 2.2 Best Practice Penulisan Store

Aturan main yang sebaiknya lo ikuti:

**1. Pisahkan type dari implementasi**

```ts
// ✅ Type di-export, biar bisa dipakai di tempat lain
export type CounterState = {
  count: number;
  increment: () => void;
};
```

**2. Action selalu di dalam store**

```ts
// ❌ JELEK: logic di luar store, susah di-test
function incrementCount() {
  const current = useCounterStore.getState().count;
  useCounterStore.setState({ count: current + 1 });
}

// ✅ BAGUS: action sebagai bagian dari store
const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

**3. Gunakan immer untuk state yang nested (kita bahas nanti di Intermediate)**

**4. Jangan store derived state**

```ts
// ❌ JELEK: doubleCount harus di-sync manual setiap count berubah
type State = {
  count: number;
  doubleCount: number; // derived, jangan di-store!
};

// ✅ BAGUS: hitung di komponen atau via selector
const doubleCount = useCounterStore((state) => state.count * 2);
```

### 2.3 Pemisahan File (Struktur Awal)

Untuk project kecil-medium, mulai dengan struktur ini:

```
src/
├── components/
│   └── Counter.tsx
├── store/
│   ├── counterStore.ts
│   └── types.ts          # opsional, untuk type yang dipakai bareng
└── App.tsx
```

Contoh `types.ts`:

```ts
// src/store/types.ts
export type Counter = {
  count: number;
};

export type CounterActions = {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

export type CounterStore = Counter & CounterActions;
```

```ts
// src/store/counterStore.ts
import { create } from 'zustand';
import type { CounterStore } from './types';

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

Pemisahan `Counter` (state) dan `CounterActions` (action) sebagai 2 type berbeda berguna kalau nanti store-nya makin kompleks.

---

## 3. Intermediate

### 3.1 Multiple Store vs Single Store

Salah satu pertanyaan paling sering: "Gua bikin 1 store besar atau banyak store kecil?"

**Jawaban gua:** **multiple store, dipecah berdasarkan domain**.

| Pendekatan | Kapan dipakai |
|---|---|
| **Single store** | App kecil, state semuanya saling terkait, atau lo butuh transactional update lintas domain |
| **Multiple store** | Domain berbeda (auth, cart, products, ui). Ini default yang lo pilih untuk project medium-besar. |

**Contoh multiple store yang sehat:**

```
src/store/
├── authStore.ts      → user, token, login, logout
├── cartStore.ts      → items, total, addItem, removeItem
├── productStore.ts   → products, fetchProducts, filter
└── uiStore.ts        → theme, sidebarOpen, toggleSidebar
```

Kenapa multi-store lebih sehat?
- Setiap store punya tanggung jawab jelas (Single Responsibility)
- Re-render lebih terkontrol (komponen yang pakai authStore gak terganggu cartStore)
- Test lebih gampang (lo bisa test 1 store independen)
- Tim besar bisa kerja paralel tanpa conflict

### 3.2 Async Action (Fetch API)

Salah satu hal yang bikin Zustand enak: async action ditulis biasa aja, gak perlu thunk/saga.

```ts
// src/store/productStore.ts
import { create } from 'zustand';

type Product = {
  id: number;
  name: string;
  price: number;
};

type ProductState = {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Gagal fetch products');
      const data: Product[] = await res.json();
      set({ products: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },
}));
```

Pakai di komponen:

```tsx
import { useEffect } from 'react';
import { useProductStore } from '../store/productStore';

export function ProductList() {
  const products = useProductStore((s) => s.products);
  const isLoading = useProductStore((s) => s.isLoading);
  const error = useProductStore((s) => s.error);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name} — Rp {p.price.toLocaleString('id-ID')}</li>
      ))}
    </ul>
  );
}
```

### 3.3 Pattern Loading/Error/Success yang Rapi

Trio `isLoading + error + data` itu standar, tapi bisa lebih elegant pakai **status enum**:

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';

type ProductState = {
  products: Product[];
  status: Status;
  error: string | null;
  fetchProducts: () => Promise<void>;
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  status: 'idle',
  error: null,

  fetchProducts: async () => {
    set({ status: 'loading', error: null });
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Gagal fetch');
      const data = await res.json();
      set({ products: data, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ status: 'error', error: message });
    }
  },
}));
```

Di komponen jadi lebih bersih:

```tsx
const status = useProductStore((s) => s.status);

if (status === 'loading') return <Spinner />;
if (status === 'error') return <ErrorMsg />;
if (status === 'success') return <ProductTable />;
return null; // idle
```

### 3.4 Middleware: Persist & DevTools

Zustand punya middleware yang bisa di-stack. Dua yang paling sering dipakai:

#### `persist` — Simpan State ke localStorage

Berguna buat auth token, theme, cart, dsb yang harus survive setelah refresh.

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type AuthState = {
  token: string | null;
  user: { id: number; name: string } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage', // nama key di localStorage
      storage: createJSONStorage(() => localStorage),
      // partialize: pilih field yang mau di-persist aja
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
```

> **Note penting soal sintaks:** perhatiin `create<AuthState>()(...)` — ada **`()` kosong** sebelum middleware. Ini wajib kalau lo pakai middleware dengan TypeScript. Tanpa itu, type inference Zustand bisa rusak.

#### `devtools` — Integrasi Redux DevTools

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useCounterStore = create<CounterState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'counter/increment'),
    }),
    { name: 'CounterStore' } // nama yang muncul di DevTools
  )
);
```

Argumen ke-3 di `set` (`'counter/increment'`) adalah **action name** yang muncul di Redux DevTools — ini bikin debugging jauh lebih enak.

#### Stack Middleware

Bisa digabung:

```ts
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({ /* ... */ }),
      { name: 'auth-storage' }
    ),
    { name: 'AuthStore' }
  )
);
```

> **Aturan urutan:** `devtools` di paling luar, `persist` di dalam. Kalau dibalik, action yang muncul di DevTools jadi `'persist'` doang, bukan action asli lo.

---

## 4. Advanced

### 4.1 Arsitektur Project Scalable

Untuk project production-ready, ini struktur folder yang gua rekomendasikan:

```
src/
├── api/                    # HTTP client + endpoint definitions
│   ├── client.ts           # axios/fetch instance
│   └── productApi.ts       # endpoints khusus product
│
├── features/               # FITUR-FITUR APP, dipisah per domain
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types.ts
│   │   └── index.ts        # public API dari feature ini
│   │
│   └── products/
│       ├── components/
│       │   ├── ProductList.tsx
│       │   ├── ProductForm.tsx
│       │   └── ProductCard.tsx
│       ├── hooks/
│       │   └── useProductActions.ts
│       ├── store/
│       │   ├── productStore.ts
│       │   ├── productSelectors.ts
│       │   └── productSlices.ts   # opsional, kalau pakai slice pattern
│       ├── api.ts
│       ├── types.ts
│       └── index.ts
│
├── shared/                 # kode yang dipake banyak feature
│   ├── components/         # Button, Input, Modal, dsb
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── store/                  # global store (yang lintas feature)
│   └── uiStore.ts
│
├── routes/
└── App.tsx
```

**Prinsip yang dipake:**
- **Feature-based**, bukan type-based. Folder utamanya per fitur, bukan `components/`, `stores/`, `hooks/` yang flat.
- Setiap feature **self-contained** — bisa dipindah/dihapus tanpa ngerusak feature lain
- File `index.ts` di tiap feature jadi "public API" — feature lain cuma boleh import dari sana

### 4.2 Pattern Reusable: Slices

Kalau store lo udah gede, pecah jadi **slices**:

```ts
// src/features/products/store/productSlices.ts
import type { StateCreator } from 'zustand';

// Slice 1: data products
export type ProductDataSlice = {
  products: Product[];
  setProducts: (products: Product[]) => void;
};

export const createProductDataSlice: StateCreator<
  ProductDataSlice & ProductFilterSlice,  // type gabungan
  [],
  [],
  ProductDataSlice
> = (set) => ({
  products: [],
  setProducts: (products) => set({ products }),
});

// Slice 2: filter
export type ProductFilterSlice = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

export const createProductFilterSlice: StateCreator<
  ProductDataSlice & ProductFilterSlice,
  [],
  [],
  ProductFilterSlice
> = (set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
});
```

Gabungkan jadi 1 store:

```ts
// src/features/products/store/productStore.ts
import { create } from 'zustand';
import { createProductDataSlice, ProductDataSlice } from './productSlices';
import { createProductFilterSlice, ProductFilterSlice } from './productSlices';

type ProductStore = ProductDataSlice & ProductFilterSlice;

export const useProductStore = create<ProductStore>()((...a) => ({
  ...createProductDataSlice(...a),
  ...createProductFilterSlice(...a),
}));
```

Manfaat slice pattern:
- Test masing-masing slice independen
- Kalau slice A dibutuhkan di store lain, tinggal di-reuse

### 4.3 Performance Optimization

#### Selector — Re-render Hanya Saat Perlu

Udah disinggung, tapi ini detail teknisnya. Zustand pake `Object.is` untuk compare hasil selector:

```ts
// ❌ Re-render setiap kali store berubah (bahkan field lain)
const state = useStore();

// ✅ Re-render cuma kalau "name" berubah
const name = useStore((s) => s.user.name);
```

#### `useShallow` untuk Object/Array Selector

Kalau lo butuh ambil **beberapa field sekaligus**, hasilnya berupa object baru. Tanpa shallow compare, ini selalu dianggap berubah → re-render terus.

```ts
// ❌ Re-render setiap kali ada update di store, walau name & email gak berubah
const { name, email } = useStore((s) => ({ name: s.name, email: s.email }));
```

Solusinya pakai `useShallow`:

```ts
import { useShallow } from 'zustand/react/shallow';

// ✅ Re-render cuma kalau name ATAU email berubah
const { name, email } = useStore(
  useShallow((s) => ({ name: s.name, email: s.email }))
);
```

> **Catatan versi:** `useShallow` adalah API resmi di Zustand v4.4+. Di versi lama (< v4.4) lo pakai `shallow` sebagai argumen kedua: `useStore(selector, shallow)`. Cek versi Zustand lo dulu.

#### Hindari Inline Object/Function di JSX

```tsx
// ❌ Object baru setiap render → child re-render
<Profile user={{ name, email }} />

// ✅ Pakai useMemo atau ambil dari store
const user = useStore(useShallow((s) => ({ name: s.name, email: s.email })));
<Profile user={user} />
```

#### `subscribeWithSelector` untuk Subscribe di Luar React

Kalau lo butuh react ke perubahan state di luar React (misal logging, analytics):

```ts
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create<State>()(
  subscribeWithSelector((set) => ({ /* ... */ }))
);

// di luar React
const unsubscribe = useStore.subscribe(
  (state) => state.user,           // selector
  (user, prevUser) => {            // listener
    console.log('User berubah:', prevUser, '→', user);
  }
);
```

---

## 5. Real Case Study: CRUD Products (Pure Frontend, No Backend)

Sekarang gabungkan semuanya jadi mini-app realistis. Skenarionya: aplikasi manajemen products dengan fitur **list, create, update, delete** — **tanpa backend**.

Datanya disimpan di **localStorage** lewat middleware `persist`, jadi data tetap aman walaupun lo refresh browser.

> **Kenapa pendekatan ini bagus buat belajar?**
> - Lo fokus ke konsep state management, gak terganggu setup backend
> - Showcase fitur `persist` Zustand yang emang sering dipake di production (theme, cart, draft, dll)
> - Pattern-nya tetap **migration-ready** — kalau besok lo punya backend, struktur kodenya udah bener tinggal swap layer-nya

### 5.1 Struktur Folder

```
src/
├── features/
│   └── products/
│       ├── types.ts
│       ├── utils.ts                # helper: generate id, dsb
│       ├── store/
│       │   ├── productStore.ts
│       │   └── productSelectors.ts
│       ├── components/
│       │   ├── ProductList.tsx
│       │   ├── ProductForm.tsx
│       │   └── ProductRow.tsx
│       └── index.ts
└── App.tsx
```

> Catatan: di versi ini gak ada folder `api/`. Tapi tetap ada **separation of concerns** — types, store, dan components dipisah jelas.

### 5.2 Types

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

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductInput = Partial<CreateProductInput> & { id: string };
```

> **Note:** karena gak ada API call, kita gak butuh `Status` enum (`'idle' | 'loading' | 'success' | 'error'`). Operasi localStorage itu sinkron dan instan. Tapi `error` state masih kita simpan buat handle validation error.

### 5.3 Utils

```ts
// src/features/products/utils.ts

// ID generator sederhana — di production bisa pakai crypto.randomUUID() atau nanoid
export const generateId = (): string => {
  return `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};
```

### 5.4 Store (dengan `persist`)

Inilah inti dari pendekatan no-backend. Semua data CRUD dikelola di store, dan otomatis di-sync ke localStorage.

```ts
// src/features/products/store/productStore.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../utils';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from '../types';

type ProductState = {
  // data
  products: Product[];
  error: string | null;

  // actions — CRUD lengkap
  createProduct: (input: CreateProductInput) => Product | null;
  updateProduct: (input: UpdateProductInput) => Product | null;
  deleteProduct: (id: string) => boolean;

  // utilities
  clearError: () => void;
  resetAll: () => void;
};

// Validasi input — biar logic-nya gak campur di komponen
const validateProduct = (input: CreateProductInput): string | null => {
  if (!input.name.trim()) return 'Nama product tidak boleh kosong';
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
          const validationError = validateProduct(input);
          if (validationError) {
            set({ error: validationError }, false, 'products/create/error');
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
            (state) => ({
              products: [...state.products, product],
              error: null,
            }),
            false,
            'products/create/success'
          );
          return product;
        },

        updateProduct: ({ id, ...input }) => {
          const existing = get().products.find((p) => p.id === id);
          if (!existing) {
            set({ error: 'Product tidak ditemukan' }, false, 'products/update/notfound');
            return null;
          }

          // Gabungkan data lama + input baru, lalu validasi
          const merged = { ...existing, ...input };
          const validationError = validateProduct({
            name: merged.name,
            price: merged.price,
            stock: merged.stock,
          });
          if (validationError) {
            set({ error: validationError }, false, 'products/update/error');
            return null;
          }

          const updated: Product = {
            ...merged,
            updatedAt: new Date().toISOString(),
          };

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
            set({ error: 'Product tidak ditemukan' }, false, 'products/delete/notfound');
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

        clearError: () => set({ error: null }, false, 'products/clearError'),

        resetAll: () =>
          set({ products: [], error: null }, false, 'products/resetAll'),
      }),
      {
        name: 'product-storage',                          // key di localStorage
        storage: createJSONStorage(() => localStorage),
        version: 1,                                       // untuk migration nanti
        // partialize: hanya persist field yang perlu — error state gak perlu disimpan
        partialize: (state) => ({ products: state.products }),
      }
    ),
    { name: 'ProductStore' }
  )
);
```

**Hal penting yang harus lo perhatikan di store ini:**

1. **Action tidak `async`** — karena localStorage sinkron, gak perlu Promise. Lebih simpel, return value-nya langsung tersedia.
2. **Validasi terpusat di `validateProduct`** — DRY, dipakai di create dan update. Logic bisnis terkumpul di satu tempat.
3. **`partialize` cuma simpan `products`** — `error` state gak perlu di-persist (gak masuk akal kalau setelah refresh masih nampilin error lama).
4. **`version: 1`** — siap-siap kalau besok struktur Product berubah, lo bisa pake migration (kita bahas di section 5.8).
5. **Action return value** — sukses return data/`true`, gagal return `null`/`false`. Komponen bisa cek hasilnya tanpa harus subscribe ke `error`.
6. **DevTools naming** — setiap `set()` punya label jelas (`products/create/success`, dll). Buka Redux DevTools, lo bisa replay setiap action.
7. **`resetAll()`** — berguna banget buat development & testing, tinggal panggil `useProductStore.getState().resetAll()` di console.

### 5.5 Selectors (Pisahkan dari Store)

```ts
// src/features/products/store/productSelectors.ts
import { useProductStore } from './productStore';
import { useShallow } from 'zustand/react/shallow';
import type { Product } from '../types';

// Selector dasar
export const useProducts = () => useProductStore((s) => s.products);
export const useProductError = () => useProductStore((s) => s.error);

// Computed selector — derived state
export const useProductById = (id: string): Product | undefined =>
  useProductStore((s) => s.products.find((p) => p.id === id));

export const useProductCount = () =>
  useProductStore((s) => s.products.length);

export const useTotalStock = () =>
  useProductStore((s) => s.products.reduce((sum, p) => sum + p.stock, 0));

export const useTotalValue = () =>
  useProductStore((s) =>
    s.products.reduce((sum, p) => sum + p.price * p.stock, 0)
  );

// Group action — biar komponen tinggal ambil 1 hook
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

Pemisahan selector bikin komponen jauh lebih bersih dan derived state (`totalStock`, `totalValue`) bisa di-reuse dimana aja.

### 5.6 Komponen UI

#### ProductList

```tsx
// src/features/products/components/ProductList.tsx
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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Belum ada product. Tambah product pertama lo!</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
        Total: {count} product · {totalStock} stok ·{' '}
        Rp {totalValue.toLocaleString('id-ID')} value
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Nama</th>
            <th style={{ textAlign: 'right' }}>Harga</th>
            <th style={{ textAlign: 'right' }}>Stok</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

> Lihat: gak ada `useEffect` buat fetch data lagi. Karena `persist` middleware otomatis hydrate state dari localStorage saat app load.

#### ProductRow (dengan inline edit mode)

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
    const updated = updateProduct({ id: product.id, name, price, stock });
    if (updated) {
      setIsEditing(false);
    }
    // kalau gagal, error otomatis muncul di store dan ditampilin di App
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

  if (isEditing) {
    return (
      <tr>
        <td>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%' }}
          />
        </td>
        <td>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            style={{ width: '100%', textAlign: 'right' }}
          />
        </td>
        <td>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            style={{ width: '100%', textAlign: 'right' }}
          />
        </td>
        <td>
          <button onClick={handleSave}>Simpan</button>
          <button onClick={handleCancel}>Batal</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{product.name}</td>
      <td style={{ textAlign: 'right' }}>
        Rp {product.price.toLocaleString('id-ID')}
      </td>
      <td style={{ textAlign: 'right' }}>{product.stock}</td>
      <td>
        <button onClick={() => setIsEditing(true)}>Edit</button>
        <button onClick={handleDelete}>Hapus</button>
      </td>
    </tr>
  );
}
```

#### ProductForm

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

    const created = createProduct({
      name: name.trim(),
      price: typeof price === 'number' ? price : 0,
      stock: typeof stock === 'number' ? stock : 0,
    });

    if (created) {
      // reset form kalau berhasil
      setName('');
      setPrice('');
      setStock('');
    }
    // kalau gagal, store udah set error → ditampilin oleh ErrorBanner di App
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama product"
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

#### ErrorBanner (centralized error display)

```tsx
// src/features/products/components/ErrorBanner.tsx
import { useProductError, useProductActions } from '../store/productSelectors';

export function ErrorBanner() {
  const error = useProductError();
  const { clearError } = useProductActions();

  if (!error) return null;

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <span>⚠️ {error}</span>
      <button onClick={clearError}>×</button>
    </div>
  );
}
```

### 5.7 Public API Feature & App

```ts
// src/features/products/index.ts
// HANYA ekspor yang feature lain (atau App.tsx) butuh.
// Internal store, types, utils — TIDAK di-export keluar.
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
      <h1>Manajemen Product</h1>
      <p style={{ color: '#666' }}>
        Data disimpan otomatis di browser (localStorage).
      </p>

      <ErrorBanner />
      <ProductForm />
      <ProductList />
    </div>
  );
}
```

Hasil akhir: refresh browser, data lo tetap ada. Buka tab baru, data juga ada (karena localStorage sharing antar tab di domain yang sama).

### 5.8 Bonus: Migration saat Schema Berubah

Salah satu masalah pendekatan persist: kalau lo update struktur data, user yang udah punya data lama bisa rusak. Zustand handle ini lewat **versioning + migration**:

```ts
// Misal di v2 lo nambahin field "category"
type ProductV2 = Product & { category: string };

persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'product-storage',
    storage: createJSONStorage(() => localStorage),
    version: 2,                // naikkan versi
    migrate: (persistedState: any, version: number) => {
      // dipanggil otomatis kalau versi di localStorage < versi sekarang
      if (version === 1) {
        // tambahkan default value untuk field baru
        persistedState.products = persistedState.products.map((p: any) => ({
          ...p,
          category: 'Uncategorized',
        }));
      }
      return persistedState;
    },
  }
);
```

Ini sering di-skip orang, padahal penting banget kalau app lo udah dipake real user.

### 5.9 Bonus: Export & Import Data

Karena gak ada backend, fitur backup/restore jadi nilai plus:

```ts
// Tambahkan di store action
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
    set({ error: 'JSON tidak valid' });
    return false;
  }
},
```

Tinggal bikin tombol "Download backup" yang trigger download file JSON, dan tombol "Restore" yang upload file. User tetap punya kontrol penuh atas data mereka.

### 5.10 Migration ke Backend (Kalau Suatu Saat Butuh)

Karena struktur kode lo udah feature-based dan selectors-nya rapi, migrasi ke backend cuma butuh perubahan di **store layer**. Komponen UI **tidak berubah sama sekali**.

Roadmap migrasinya:

1. Buat folder `api/` + `productApi.ts` (kayak yang ada di versi original)
2. Ubah action di store jadi `async`, tambahkan `status: 'idle' | 'loading' | 'success' | 'error'`
3. Hapus `persist` middleware (atau ganti jadi cache-only buat offline support)
4. Selector tetap sama, komponen tetap sama

Inilah kenapa **separation of concerns** itu penting dari awal — meskipun lo mulai dari mini-app, ketika scale lo udah siap.

---

## 6. Best Practices & Anti-Patterns

### 6.1 Kesalahan Umum

#### ❌ Mengambil seluruh store

```tsx
const state = useStore(); // re-render setiap state berubah
```

✅ Selalu pake selector spesifik.

#### ❌ Menyimpan derived state

```ts
// JELEK — total harus di-update manual setiap items berubah
type CartState = {
  items: Item[];
  total: number;
};
```

✅ Hitung di selector / komponen:

```ts
const total = useCartStore((s) => s.items.reduce((sum, i) => sum + i.price, 0));
```

#### ❌ Mutate state langsung

```ts
// JELEK — Zustand gak detect perubahan ini
addItem: (item) => set((state) => {
  state.items.push(item); // mutasi langsung!
  return state;
}),
```

✅ Selalu return object baru:

```ts
addItem: (item) => set((state) => ({ items: [...state.items, item] })),
```

> Atau pake middleware `immer` kalau update nested-nya kompleks:
>
> ```ts
> import { immer } from 'zustand/middleware/immer';
>
> create<State>()(
>   immer((set) => ({
>     addItem: (item) => set((state) => {
>       state.items.push(item); // BOLEH karena immer
>     }),
>   }))
> );
> ```

#### ❌ Side-effect di dalam selector

```ts
// JELEK — bisa infinite loop
const products = useStore((s) => {
  console.log('selecting'); // ok
  s.fetchProducts(); // ❌ JANGAN trigger action di selector!
  return s.products;
});
```

✅ Side-effect (fetch, log, dsb) wajib di `useEffect` atau event handler.

#### ❌ Multiple `set()` berurutan

```ts
// JELEK — 2x trigger re-render
fetchData: async () => {
  set({ isLoading: true });
  set({ error: null });
  // ...
}
```

✅ Gabung jadi satu:

```ts
fetchData: async () => {
  set({ isLoading: true, error: null });
  // ...
}
```

#### ❌ Bikin store di dalam komponen

```tsx
// JELEK — store dibuat ulang setiap render!
function App() {
  const useStore = create(() => ({ count: 0 }));
  // ...
}
```

✅ Store didefinisikan di module scope (di luar komponen).

#### ❌ Lupa cleanup `subscribe` manual

```ts
// JELEK — memory leak
useEffect(() => {
  useStore.subscribe((state) => console.log(state));
}, []);
```

✅ Selalu return unsubscribe-nya:

```ts
useEffect(() => {
  const unsub = useStore.subscribe((state) => console.log(state));
  return unsub;
}, []);
```

### 6.2 Tips Code yang Maintainable

**1. Naming conventions yang konsisten**

- Hook store: `useXxxStore` (`useAuthStore`, `useProductStore`)
- Action: kata kerja (`fetchProducts`, `addItem`, `removeUser`)
- Status field: `status` enum atau `isXxx` boolean (`isLoading`, `isMutating`)

**2. Action terpisah berdasarkan intent**

```ts
// ❌ Ambigu
setUser: (data) => set({ user: data }),

// ✅ Jelas
loginUser: (credentials) => { /* ... */ },
logoutUser: () => set({ user: null, token: null }),
updateProfile: (profile) => { /* ... */ },
```

**3. Store gak boleh tau soal UI**

```ts
// ❌ JELEK — store gak boleh punya logic UI
deleteProduct: async (id) => {
  if (!confirm('Yakin?')) return; // JANGAN!
  // ...
}

// ✅ Confirm di komponen, store cuma terima keputusan akhir
```

**4. Test action lo**

Karena Zustand store cuma fungsi biasa, test-nya gampang:

```ts
import { act, renderHook } from '@testing-library/react';
import { useCounterStore } from './counterStore';

test('increment menambah count sebanyak 1', () => {
  const { result } = renderHook(() => useCounterStore());

  act(() => result.current.increment());

  expect(result.current.count).toBe(1);
});

// Atau lebih simpel, tanpa renderHook:
test('reset mengembalikan count ke 0', () => {
  useCounterStore.setState({ count: 99 });
  useCounterStore.getState().reset();
  expect(useCounterStore.getState().count).toBe(0);
});
```

**5. Kapan TIDAK pakai Zustand**

- State yang cuma dipake di 1 komponen → cukup `useState`
- State server (data dari API yang butuh cache, refetch, invalidation) → mendingan **TanStack Query / SWR**, bukan Zustand. Zustand bagus buat **client state**.
- Form state yang kompleks → React Hook Form lebih cocok

> Pola yang sehat di project modern: **Zustand untuk client state, TanStack Query untuk server state, RHF untuk form state**. Mereka komplementer, bukan kompetitor.

---

## Penutup

Kalau lo udah ngerti semua poin di atas, lo udah siap pake Zustand di project production. Rangkuman aturan emas:

1. **Selector spesifik** — jangan ambil semua state
2. **Pisahkan store, UI, dan utility** — jangan campur jadi 1 file
3. **Feature-based folder** — bukan flat
4. **Validasi di store, bukan di komponen** — komponen cuma kirim input dan terima hasil
5. **DevTools + Persist** — gak boleh skip di production
6. **Versioning + migration** kalau pakai persist, biar data user gak rusak saat update
7. **Zustand untuk client state, TanStack Query untuk server state** (kalau nanti pakai backend)

Aplikasi CRUD di section 5 tadi udah cukup buat kebanyakan use case kecil-medium yang gak butuh backend: catatan pribadi, todo list, mini inventory, draft form, expense tracker, dll. Datanya aman di localStorage, bisa di-export, dan struktur kodenya udah migration-ready ke backend kapan pun lo butuh.

Selamat ngoding bro! Kalau ada bagian yang masih kurang jelas atau pengen contoh lebih spesifik (misal nambahin search/filter, sorting, pagination di sisi client, integrasi React Hook Form, atau testing CRUD-nya), tinggal bilang aja.