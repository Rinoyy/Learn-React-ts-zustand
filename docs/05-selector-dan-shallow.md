# Selector dan `useShallow`

> Cara kamu membaca state dari store menentukan seberapa sering komponen re-render. Bagian ini menjelaskan cara yang benar dan mengapa.

---

## Bagian 1 — Masalah: Mengambil Seluruh Store

Cara paling sederhana menggunakan store Zustand adalah tidak memberikan selector sama sekali:

```tsx
// Tanpa selector — ambil seluruh state sekaligus
const state = useProductStore();
const { products, isLoading, error } = state;
```

Ini terlihat nyaman. Tapi ini adalah anti-pattern yang menyebabkan re-render berlebihan.

Kenapa? Karena tanpa selector, komponen berlangganan ke **seluruh store**. Setiap kali field **apapun** di store berubah — termasuk field yang tidak kamu pakai di komponen ini — komponen akan re-render.

Bayangkan store produk:

```ts
type ProductStore = {
  products: Product[];    // dipakai di ProductList
  isLoading: boolean;     // dipakai di LoadingSpinner
  error: string | null;   // dipakai di ErrorBanner
  searchQuery: string;    // dipakai di SearchBar
  selectedId: string | null; // dipakai di ProductDetail
};
```

Kalau `SearchBar` mengambil seluruh store:

```tsx
function SearchBar() {
  const state = useProductStore(); // subscribe ke SEMUANYA
  return <input value={state.searchQuery} />;
}
```

Setiap kali user klik produk (`selectedId` berubah), `SearchBar` re-render — padahal tampilan `SearchBar` sama sekali tidak berubah.

---

## Bagian 2 — Solusi: Selector

**Selector** adalah fungsi yang kamu berikan ke hook store untuk memilih hanya bagian yang dibutuhkan.

```tsx
// Sintaks: useStore((state) => nilaiYangDibutuhkan)

function SearchBar() {
  const searchQuery = useProductStore((state) => state.searchQuery);
  //                                  ↑ hanya ambil searchQuery
  return <input value={searchQuery} />;
}
```

Sekarang `SearchBar` hanya subscribe ke `searchQuery`. Perubahan pada `selectedId`, `isLoading`, atau field lain tidak akan menyentuh komponen ini.

Setiap field = satu panggilan hook:

```tsx
function ProductDetail() {
  const products = useProductStore((state) => state.products);
  const selectedId = useProductStore((state) => state.selectedId);
  const isLoading = useProductStore((state) => state.isLoading);

  const product = products.find((p) => p.id === selectedId);
  // ...
}
```

---

## Bagian 3 — Derived State: Hitung di Selector

Selector bisa melakukan komputasi, bukan hanya mengambil field secara langsung.

```tsx
// Alih-alih menyimpan totalHarga di store (yang harus di-update manual),
// hitung langsung di selector:
const totalHarga = useCartStore(
  (state) => state.items.reduce((sum, item) => sum + item.price * item.qty, 0)
);

// Atau: cari product berdasarkan ID
const product = useProductStore(
  (state) => state.products.find((p) => p.id === targetId)
);

// Atau: filter
const activeProducts = useProductStore(
  (state) => state.products.filter((p) => p.isActive)
);
```

Ini disebut **derived state** — data yang diturunkan dari state utama. Keuntungannya: tidak perlu menyimpan data yang redundan di store, dan selalu up-to-date otomatis.

**Peringatan penting:** selector yang mengembalikan **array atau object baru** akan selalu memicu re-render, walaupun isinya sama. Ini karena cara `Object.is` bekerja (lihat [03-re-render.md](./03-re-render.md)).

```tsx
// ❌ filter() dan find() selalu mengembalikan referensi baru
const activeProducts = useProductStore(
  (state) => state.products.filter((p) => p.isActive)
  // Setiap kali store berubah, filter() membuat array baru
  // Object.is([...], [...]) → false → re-render selalu terjadi
);
```

Untuk kasus ini ada dua solusi:
1. Gunakan `useShallow` jika hasilnya array/object yang bisa dibandingkan per-item
2. Simpan derived state di variabel lokal komponen dengan `useMemo`

---

## Bagian 4 — Masalah: Mengambil Beberapa Field Sekaligus

Terkadang satu komponen butuh beberapa field dari store. Kalau kamu tulis satu hook per field:

```tsx
const name = useUserStore((state) => state.name);
const email = useUserStore((state) => state.email);
const role = useUserStore((state) => state.role);
```

Ini valid dan aman, tapi verbose. Kamu mungkin tergoda untuk menggabungkannya:

```tsx
// ❌ MASALAH — mengembalikan object baru setiap kali
const { name, email, role } = useUserStore((state) => ({
  name: state.name,
  email: state.email,
  role: state.role,
}));
```

`{ name, email, role }` adalah object **baru** setiap kali selector dijalankan, walaupun nilai `name`, `email`, `role` tidak berubah. `Object.is` membandingkan referensi object — selalu `false` — sehingga komponen re-render setiap kali store berubah apapun.

---

## Bagian 5 — `useShallow`: Perbandingan Isi, Bukan Referensi

`useShallow` adalah solusi dari Zustand untuk masalah ini. Ia mengubah cara perbandingan: alih-alih membandingkan referensi object, ia membandingkan **setiap nilai di dalam object** satu per satu (shallow comparison).

```tsx
import { useShallow } from 'zustand/react/shallow';

// ✅ BENAR — useShallow membandingkan isi, bukan referensi
const { name, email, role } = useUserStore(
  useShallow((state) => ({
    name: state.name,
    email: state.email,
    role: state.role,
  }))
);
```

Cara kerja `useShallow`:

```
Sebelumnya: { name: 'Alice', email: 'alice@example.com', role: 'admin' }
Sekarang:   { name: 'Alice', email: 'alice@example.com', role: 'admin' }

Tanpa useShallow:
  Object.is(sebelumnya, sekarang) → false (beda referensi) → re-render ❌

Dengan useShallow:
  name === 'Alice'? ✅
  email === 'alice@...? ✅
  role === 'admin'? ✅
  Semua sama → tidak re-render ✅
```

---

## Bagian 6 — `useShallow` untuk Array

`useShallow` juga bekerja untuk array — ia membandingkan setiap elemen.

```tsx
// ✅ Mengambil beberapa action sekaligus (action itu referensinya tetap sama)
const [addItem, removeItem, clearCart] = useCartStore(
  useShallow((state) => [state.addItem, state.removeItem, state.clearCart])
);
```

Untuk array yang berisi objek-objek kompleks, `useShallow` hanya membandingkan satu level. Artinya kalau kamu punya `[{id:1}, {id:2}]` dan ada satu field dalam object yang berubah, perbandingan bisa bermasalah. Untuk kasus seperti itu, pertimbangkan mengambil ID-nya saja dan melakukan pencarian terpisah.

---

## Bagian 7 — Memisahkan Selector ke File Terpisah

Untuk project yang lebih besar, daripada menulis selector langsung di komponen, lebih baik pisahkan ke file dedicated:

```ts
// src/features/products/store/productSelectors.ts
import { useProductStore } from './productStore';
import { useShallow } from 'zustand/react/shallow';

// Selector sederhana
export const useProducts = () => useProductStore((s) => s.products);
export const useIsLoading = () => useProductStore((s) => s.isLoading);
export const useProductError = () => useProductStore((s) => s.error);

// Selector dengan komputasi
export const useProductById = (id: string) =>
  useProductStore((s) => s.products.find((p) => p.id === id));

export const useProductCount = () =>
  useProductStore((s) => s.products.length);

// Selector action (dikelompokkan)
export const useProductActions = () =>
  useProductStore(
    useShallow((s) => ({
      createProduct: s.createProduct,
      updateProduct: s.updateProduct,
      deleteProduct: s.deleteProduct,
    }))
  );
```

Keuntungannya:
- Komponen jadi bersih — hanya import selector, tidak perlu tahu bentuk store
- Selector bisa di-reuse di banyak komponen
- Kalau struktur store berubah, kamu cukup update selector — komponen tidak perlu diubah

---

## Bagian 8 — Ringkasan: Kapan Pakai Apa

| Situasi | Cara yang Tepat |
|---|---|
| Ambil 1 field primitif (angka, string, boolean) | `useStore((s) => s.fieldName)` |
| Ambil beberapa field sekaligus | `useStore(useShallow((s) => ({ a: s.a, b: s.b })))` |
| Hitung derived value (sum, find, filter) yang return primitif | `useStore((s) => s.items.length)` |
| Hitung derived value yang return array/object | `useStore(useShallow((s) => s.items.filter(...)))` atau `useMemo` |
| Ambil beberapa action sekaligus | `useStore(useShallow((s) => [s.action1, s.action2]))` |

> **Aturan emas:** kalau selector mengembalikan **object literal baru** atau **array baru**, bungkus dengan `useShallow`. Kalau mengembalikan nilai primitif atau referensi yang sudah ada di store (bukan dibuat baru), `useShallow` tidak diperlukan.
