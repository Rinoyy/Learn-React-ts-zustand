# Arsitektur Store yang Scalable

> Satu store besar atau banyak store kecil? Bagaimana mengatur folder ketika project berkembang? Bagian ini menjawab pertanyaan-pertanyaan itu.

---

## Bagian 1 — Masalah: Store Monolith

Ketika project baru dimulai, mudah untuk menaruh semua state di satu store besar:

```ts
// Satu store untuk segalanya — terlihat praktis di awal
const useAppStore = create((set) => ({
  // Auth state
  user: null,
  token: null,
  login: () => { ... },
  logout: () => { ... },

  // Cart state
  cartItems: [],
  addToCart: () => { ... },
  removeFromCart: () => { ... },

  // Product state
  products: [],
  fetchProducts: () => { ... },

  // UI state
  theme: 'light',
  sidebarOpen: false,
  toggleSidebar: () => { ... },
}));
```

Masalah yang muncul seiring waktu:
- **File jadi ribuan baris** — susah dinavigasi
- **Semua developer konflik di file yang sama** ketika kerja paralel
- **Testing susah** — untuk test login, kamu harus load seluruh store termasuk cart dan products
- **Re-render tidak terkontrol** — komponen cart re-render karena theme berubah

---

## Bagian 2 — Solusi: Multiple Store, Satu Per Domain

Pecah store berdasarkan **domain** (tanggung jawab bisnis):

```
src/store/
├── authStore.ts       → semua tentang user, login, logout, token
├── cartStore.ts       → item cart, tambah, hapus, total
├── productStore.ts    → list produk, filter, fetch
└── uiStore.ts         → theme, sidebar, modal, notification
```

Setiap store punya **satu tanggung jawab yang jelas**. Ini prinsip **Single Responsibility**.

```ts
// authStore.ts — hanya urusan autentikasi
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async (credentials) => { ... },
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));

// cartStore.ts — hanya urusan keranjang belanja
export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
}));
```

Manfaatnya:
- Komponen cart tidak re-render saat user login
- Developer A bisa kerja di `cartStore` sementara Developer B di `authStore` tanpa konflik
- Bisa test `authStore` secara terisolasi tanpa load store lain

---

## Bagian 3 — Apakah Store Boleh Saling Akses?

Kadang satu action perlu data dari store lain. Misalnya: saat checkout, `cartStore` perlu tahu apakah user sudah login (dari `authStore`).

Ada dua pendekatan:

**Pendekatan 1 — Import langsung (sederhana, cocok untuk kebanyakan kasus):**

```ts
// cartStore.ts
import { useAuthStore } from './authStore';

const useCartStore = create<CartStore>((set) => ({
  checkout: async () => {
    // Baca auth store dari luar React (tanpa hook)
    const { isAuthenticated, token } = useAuthStore.getState();

    if (!isAuthenticated) {
      set({ error: 'Harus login dulu' });
      return;
    }

    // lanjutkan checkout dengan token...
  },
}));
```

**Pendekatan 2 — Data dikirim sebagai parameter (lebih testable):**

```ts
const useCartStore = create<CartStore>((set) => ({
  checkout: async (token: string) => {
    // token dikirim dari komponen yang sudah tahu kondisi auth
    // ...
  },
}));

// Di komponen:
function CheckoutButton() {
  const token = useAuthStore((s) => s.token);
  const checkout = useCartStore((s) => s.checkout);

  return <button onClick={() => checkout(token)}>Checkout</button>;
}
```

Pendekatan 2 lebih mudah di-test karena tidak ada dependency tersembunyi.

---

## Bagian 4 — Slice Pattern: Store Besar yang Terstruktur

Ketika satu domain sudah kompleks, file store bisa jadi panjang. Solusinya: **slice pattern** — pecah store menjadi bagian-bagian (slice) yang bisa digabung.

```ts
// productSlices.ts

// Slice 1: data produk
export type ProductDataSlice = {
  products: Product[];
  setProducts: (products: Product[]) => void;
};

export const createProductDataSlice: StateCreator<
  ProductDataSlice & ProductFilterSlice,
  [], [], ProductDataSlice
> = (set) => ({
  products: [],
  setProducts: (products) => set({ products }),
});

// Slice 2: filter/search
export type ProductFilterSlice = {
  searchQuery: string;
  category: string | null;
  setSearchQuery: (q: string) => void;
  setCategory: (c: string | null) => void;
};

export const createProductFilterSlice: StateCreator<
  ProductDataSlice & ProductFilterSlice,
  [], [], ProductFilterSlice
> = (set) => ({
  searchQuery: '',
  category: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategory: (category) => set({ category }),
});
```

Gabungkan slice-slice tersebut:

```ts
// productStore.ts
import { create } from 'zustand';
import { createProductDataSlice, ProductDataSlice } from './productSlices';
import { createProductFilterSlice, ProductFilterSlice } from './productSlices';

type ProductStore = ProductDataSlice & ProductFilterSlice;

export const useProductStore = create<ProductStore>()((...args) => ({
  ...createProductDataSlice(...args),
  ...createProductFilterSlice(...args),
}));
```

Manfaat slice:
- Setiap slice bisa di-test secara terpisah
- Kalau slice A dibutuhkan di store lain, tinggal di-reuse
- File store utama tetap ringkas

---

## Bagian 5 — Struktur Folder untuk Project Besar

Untuk project production, gunakan **feature-based folder structure**:

```
src/
├── features/               ← fitur-fitur dikelompokkan per domain
│   ├── auth/
│   │   ├── components/     ← UI komponen khusus auth
│   │   │   ├── LoginForm.tsx
│   │   │   └── UserAvatar.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── authSelectors.ts
│   │   ├── types.ts
│   │   └── index.ts        ← public API feature ini
│   │
│   └── products/
│       ├── components/
│       │   ├── ProductList.tsx
│       │   ├── ProductCard.tsx
│       │   └── ProductForm.tsx
│       ├── store/
│       │   ├── productStore.ts
│       │   ├── productSelectors.ts
│       │   └── productSlices.ts  ← kalau pakai slice pattern
│       ├── types.ts
│       └── index.ts
│
├── shared/                 ← kode yang dipakai banyak feature
│   ├── components/         ← Button, Input, Modal yang generik
│   ├── hooks/
│   └── utils/
│
├── store/                  ← store global (lintas feature)
│   └── uiStore.ts
│
└── App.tsx
```

**Prinsip utama:**
- Folder diatur per **feature**, bukan per tipe file (`components/`, `stores/`, `hooks/` yang flat)
- Setiap feature **self-contained** — bisa dipindah atau dihapus tanpa merusak feature lain
- File `index.ts` di tiap feature jadi "public API" — feature lain hanya boleh import dari sana

**Contoh `index.ts`:**

```ts
// src/features/products/index.ts
// Hanya ekspor yang dibutuhkan feature lain (atau App.tsx)
// Internal detail (store langsung, util, dll) TIDAK di-ekspor ke sini

export { ProductList } from './components/ProductList';
export { ProductForm } from './components/ProductForm';
export type { Product } from './types';
// Selector tidak perlu di-ekspor — dipakai internal oleh komponen
```

---

## Bagian 6 — Panduan Memutuskan Struktur

| Ukuran Project | Rekomendasi |
|---|---|
| Kecil (1-2 developer, < 10 fitur) | 2-4 store di `src/store/`, tidak perlu slice |
| Menengah (3-5 developer, 10-30 fitur) | Feature-based folder, multiple store per domain |
| Besar (5+ developer, 30+ fitur) | Feature-based + slice pattern + public API per feature |

Mulai sederhana. Refactor ke struktur yang lebih kompleks hanya ketika memang dibutuhkan. Jangan over-engineer di awal.
