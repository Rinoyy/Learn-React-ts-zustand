# Learn Basic Zustand

![Product Manager App](./src/assets/demo.png)

Project ini gue buat buat belajar **Zustand** — state management buat React yang jauh lebih simpel dibanding Redux. Daripada cuma baca docs, gue langsung bikin sesuatu yang nyata: CRUD product sederhana.

## Apa yang dibahas di sini

- Cara bikin store Zustand yang proper, bukan asal `create()` terus selesai
- Kenapa selector itu penting (biar komponen nggak re-render sia-sia)
- Pakai `persist` biar data nggak ilang waktu refresh
- Pakai `devtools` biar bisa debug state di browser
- Struktur folder yang masuk akal untuk feature-based architecture

## Tech stack

| | |
|---|---|
| **React 19** | UI framework |
| **Zustand 5** | State management |
| **React Router 7** | Routing |
| **Tailwind CSS 4** | Styling |
| **TypeScript** | Biar nggak salah ketik nama field |
| **Vite** | Dev server & bundler |

## Struktur project

```
src/
├── features/
│   └── products/
│       ├── components/     # UI: form, list, row, error banner
│       ├── store/
│       │   ├── productStore.ts      # Store utama + actions
│       │   └── productSelectors.ts  # Custom hooks per kebutuhan
│       ├── types.ts        # Type definitions
│       └── utils.ts        # Helper kecil (generate ID, dll)
├── router/
│   └── index.tsx           # Definisi routes
└── main.tsx
```

Kenapa dipisah antara store dan selector? Biar komponen tinggal `useProducts()` atau `useTotalValue()` — nggak perlu tahu cara ngambilnya dari mana. Kalau struktur store berubah, yang diubah cuma selector, bukan semua komponen.

## Cara jalanin

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`, langsung bisa tambah, edit, hapus product. Data tersimpan di localStorage jadi nggak hilang walau di-refresh.

## Yang menarik dari Zustand

Bandingkan ini:

```ts
// Redux — banyak boilerplate
dispatch(setProducts(data))
dispatch(setError(null))
dispatch(setLoading(false))

// Zustand — langsung aja
set({ products: data, error: null, loading: false })
```

Gue juga pakai `useShallow` buat selector yang return object, biar nggak trigger re-render tiap kali state lain berubah:

```ts
export const useProductActions = () =>
  useProductStore(
    useShallow((s) => ({
      createProduct: s.createProduct,
      updateProduct: s.updateProduct,
      deleteProduct: s.deleteProduct,
    }))
  );
```

## Fitur aplikasi

- Tambah product (nama, harga, stok)
- Edit inline langsung di row tabel
- Hapus dengan konfirmasi
- Validasi input (nama kosong, harga/stok negatif, stok harus integer)
- Badge warna stok: merah kalau habis, kuning kalau hampir habis, hijau kalau aman
- Summary stats: total product, total stok, total value
- Data persist di localStorage
