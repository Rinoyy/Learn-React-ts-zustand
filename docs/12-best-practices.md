# Best Practices & Anti-Patterns

> Kumpulan kesalahan yang paling sering terjadi dan cara menghindarinya. Setiap poin disertai penjelasan mengapa itu masalah, bukan sekadar larangan.

---

## Anti-Pattern 1 — Mengambil Seluruh Store

```tsx
// ❌ JANGAN — komponen re-render setiap kali field apapun di store berubah
const { products, isLoading, addProduct } = useProductStore();
```

**Kenapa masalah:** tanpa selector, komponen subscribe ke seluruh state. Perubahan pada `isLoading` akan menyebabkan komponen yang hanya butuh `products` ikut re-render.

```tsx
// ✅ BENAR — ambil hanya yang dibutuhkan
const products = useProductStore((s) => s.products);
const isLoading = useProductStore((s) => s.isLoading);
const addProduct = useProductStore((s) => s.addProduct);
```

---

## Anti-Pattern 2 — Menyimpan Derived State di Store

```ts
// ❌ JANGAN — totalHarga harus di-update manual setiap items berubah
type CartStore = {
  items: CartItem[];
  totalHarga: number;   // ← derived state yang tersimpan
  addItem: (item: CartItem) => void;
};
```

**Kenapa masalah:** `totalHarga` bergantung pada `items`. Kalau kamu lupa update `totalHarga` setiap kali `items` berubah, datanya akan tidak sinkron. Ini sumber bug yang halus dan susah dilacak.

```ts
// ✅ BENAR — hitung di selector, tidak disimpan di store
const totalHarga = useCartStore(
  (s) => s.items.reduce((sum, item) => sum + item.price * item.qty, 0)
);
```

Selector dihitung ulang setiap render, selalu fresh, tidak pernah tidak sinkron.

---

## Anti-Pattern 3 — Mutasi State Langsung

```ts
// ❌ JANGAN — Zustand tidak mendeteksi perubahan ini
addItem: (item) => set((state) => {
  state.items.push(item); // mutasi langsung!
  return state;           // mengembalikan referensi yang sama
}),
```

**Kenapa masalah:** Zustand (dan React) mendeteksi perubahan dengan membandingkan referensi objek. Kalau kamu memodifikasi objek yang sama dan mengembalikan referensi yang sama, Zustand mengira tidak ada yang berubah → tidak ada re-render.

```ts
// ✅ BENAR — selalu buat objek/array baru
addItem: (item) => set((state) => ({
  items: [...state.items, item],
})),

// ✅ ALTERNATIF — gunakan immer untuk nested state yang kompleks
// (lihat 09-immer.md)
```

---

## Anti-Pattern 4 — Side Effect di Dalam Selector

```tsx
// ❌ JANGAN — bisa menyebabkan infinite loop
const products = useProductStore((state) => {
  state.fetchProducts(); // ❌ memanggil action di dalam selector!
  return state.products;
});
```

**Kenapa masalah:** selector dijalankan setiap kali store berubah untuk membandingkan nilai. Kalau selector memanggil action yang mengubah store, itu akan memicu selector lagi, yang memanggil action lagi — infinite loop.

```tsx
// ✅ BENAR — fetch di useEffect, bukan di selector
const products = useProductStore((s) => s.products);
const fetchProducts = useProductStore((s) => s.fetchProducts);

useEffect(() => {
  fetchProducts();
}, [fetchProducts]);
```

---

## Anti-Pattern 5 — Multiple `set` Berurutan

```ts
// ❌ JANGAN — dua set = dua re-render
fetchData: async () => {
  set({ isLoading: true });   // re-render 1
  set({ error: null });        // re-render 2
  // ...
},
```

**Kenapa masalah:** setiap `set` memicu siklus update di React. Dua `set` berurutan menyebabkan dua re-render yang tidak perlu.

```ts
// ✅ BENAR — gabung dalam satu set = satu re-render
fetchData: async () => {
  set({ isLoading: true, error: null }); // satu re-render
  // ...
},
```

---

## Anti-Pattern 6 — Buat Store di Dalam Komponen

```tsx
// ❌ JANGAN — store dibuat ulang setiap kali komponen re-render!
function App() {
  const useStore = create(() => ({ count: 0 })); // ← ini dipanggil setiap render
  const count = useStore((s) => s.count);
  // ...
}
```

**Kenapa masalah:** store baru dibuat setiap render, state selalu kembali ke initial value, dan store lama tidak pernah di-cleanup → memory leak.

```ts
// ✅ BENAR — definisikan store di module scope (di luar komponen)
const useCounterStore = create(() => ({ count: 0 }));

function App() {
  const count = useCounterStore((s) => s.count);
  // ...
}
```

---

## Anti-Pattern 7 — Lupa Cleanup `subscribe`

```ts
// ❌ JANGAN — memory leak: subscribe terus berjalan setelah komponen unmount
useEffect(() => {
  useStore.subscribe((state) => console.log(state));
}, []);
```

**Kenapa masalah:** `subscribe` menambahkan listener ke store. Kalau tidak di-cleanup saat komponen unmount, listener terus berjalan dan menahan referensi ke callback — memory leak.

```ts
// ✅ BENAR — simpan return value dan kembalikan sebagai cleanup
useEffect(() => {
  const unsubscribe = useStore.subscribe((state) => console.log(state));
  return unsubscribe; // React memanggil ini saat komponen unmount
}, []);
```

---

## Anti-Pattern 8 — Logic UI di Dalam Store

```ts
// ❌ JANGAN — store tidak boleh tahu soal UI
deleteProduct: async (id) => {
  if (!confirm('Yakin mau hapus?')) return; // ← dialog adalah UI!
  // ...
},
```

**Kenapa masalah:**
- Store jadi tidak bisa di-test tanpa mock `confirm`
- Store bergantung pada browser environment
- Separation of concerns dilanggar — store seharusnya hanya mengelola data

```ts
// ✅ BENAR — konfirmasi di komponen, store hanya terima keputusan final
// Di komponen:
const handleDelete = () => {
  if (!confirm('Yakin mau hapus?')) return; // ← konfirmasi di sini
  deleteProduct(id); // ← store tidak perlu tahu ada konfirmasi
};

// Di store:
deleteProduct: (id) => {
  set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  }));
},
```

---

## Tips: Naming Conventions yang Konsisten

Konsistensi nama membuat kode lebih mudah dibaca dan diprediksi:

| Apa | Konvensi | Contoh |
|---|---|---|
| Hook store | `use` + nama + `Store` | `useAuthStore`, `useCartStore` |
| Action — ambil data | kata kerja fetch/get/load | `fetchProducts`, `loadUser` |
| Action — ubah data | kata kerja yang jelas | `addItem`, `removeUser`, `updateProfile` |
| Action — toggle | `toggle` + nama | `toggleSidebar`, `toggleDarkMode` |
| Status field | `is` + kondisi atau enum | `isLoading`, `isMutating`, `status` |
| Error field | `error` atau `xxxError` | `error`, `fetchError`, `mutationError` |

---

## Tips: Kapan TIDAK Pakai Zustand

Zustand bukan alat untuk semua pekerjaan. Jangan gunakan untuk:

| Situasi | Alat yang Tepat |
|---|---|
| State yang hanya dipakai 1 komponen | `useState` |
| State form yang kompleks (validasi, touched, dsb) | React Hook Form |
| Data dari server yang butuh cache, refetch, invalidasi | TanStack Query atau SWR |
| State yang hanya dibutuhkan selama satu flow/wizard | `useState` lokal |

> **Pola sehat di project modern:** Zustand untuk **client state** (UI state, user preferences, cart), TanStack Query untuk **server state** (data dari API), React Hook Form untuk **form state**. Ketiganya komplementer.

---

## Tips: Validasi di Store, Bukan di Komponen

Kalau ada validasi bisnis (misal: nama produk tidak boleh kosong, harga tidak boleh negatif), taruh di store — bukan di form komponen.

```ts
// ✅ Validasi di store — reusable, testable
const validate = (input: CreateInput): string | null => {
  if (!input.name.trim()) return 'Nama tidak boleh kosong';
  if (input.price < 0) return 'Harga tidak boleh negatif';
  return null;
};

createProduct: (input) => {
  const error = validate(input);
  if (error) { set({ error }); return null; }
  // lanjut buat produk...
},
```

Komponen hanya menangani interaksi UI (menyimpan state form sementara, memanggil action ketika form disubmit, menampilkan error dari store). Logic bisnis tinggal di store.
