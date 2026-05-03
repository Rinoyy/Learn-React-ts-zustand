# Fungsi `set` dan `get`

> Dua fungsi paling mendasar di Zustand. Semua perubahan state berjalan melalui `set`, dan semua pembacaan state dari dalam action berjalan melalui `get`.

---

## Bagian 1 — Posisi `set` dan `get` di Store

Ketika kamu membuat store dengan `create()`, callback yang kamu tulis menerima dua parameter: `set` dan `get`.

```ts
const useStore = create<MyStore>((set, get) => ({
  //                              ↑    ↑
  //                              |    └── untuk MEMBACA state di dalam action
  //                              └─────── untuk MENGUBAH state
  count: 0,
  name: 'Alice',

  increment: () => set(...),      // pakai set
  getName: () => get().name,      // pakai get
}));
```

`set` dan `get` hanya tersedia di dalam callback `create`. Di luar sana, ada cara lain untuk membaca dan mengubah store yang dibahas di [10-subscribe.md](./10-subscribe.md).

---

## Bagian 2 — Cara Kerja `set`: Merge, Bukan Replace

Ini adalah perilaku yang **paling penting dan sering disalahpahami**.

Ketika kamu memanggil `set`, Zustand **menggabungkan** (merge) object yang kamu berikan dengan state yang sudah ada. Ia **tidak** menghapus field lain.

```ts
const useStore = create<{ name: string; age: number; city: string }>((set) => ({
  name: 'Alice',
  age: 25,
  city: 'Jakarta',

  updateName: (newName: string) => set({ name: newName }),
  //                                    ↑ hanya satu field
}));
```

Ketika `updateName('Bob')` dipanggil:

```
State sebelum: { name: 'Alice', age: 25, city: 'Jakarta' }

set({ name: 'Bob' }) dipanggil

State sesudah: { name: 'Bob', age: 25, city: 'Jakarta' }
//                                     ↑    ↑ field lain TETAP ADA
```

`age` dan `city` tidak dihapus. Ini berbeda dengan `useState` di React:

```tsx
// useState — set MENGGANTI seluruh nilai
const [user, setUser] = useState({ name: 'Alice', age: 25 });
setUser({ name: 'Bob' }); // → { name: 'Bob' }  ← age HILANG!

// Zustand set — MENGGABUNGKAN
set({ name: 'Bob' }); // → { name: 'Bob', age: 25 }  ← age tetap ada
```

**Merge hanya berlaku satu level.** Untuk object yang nested, kamu perlu spread manual atau gunakan immer. Ini dibahas di [09-immer.md](./09-immer.md).

---

## Bagian 3 — Dua Cara Memanggil `set`

### Cara 1 — Direct update (nilai langsung)

```ts
reset: () => set({ count: 0 }),
setName: (name: string) => set({ name }),
```

Gunakan ini ketika nilai baru **tidak bergantung** pada nilai state sebelumnya.

### Cara 2 — Functional update (berdasarkan state sebelumnya)

```ts
increment: () => set((state) => ({ count: state.count + 1 })),
//                    ↑ state saat ini dipakai untuk hitung nilai baru
```

Gunakan ini ketika nilai baru **bergantung** pada nilai state sebelumnya.

**Kenapa ada dua cara?** Bayangkan dua action dipanggil hampir bersamaan (contoh: klik cepat). Dengan cara 1:

```ts
// State awal: count = 0
// Dua klik sangat cepat
set({ count: count + 1 }) // ← count dibaca dari closure: count = 0
set({ count: count + 1 }) // ← count dibaca dari closure yang sama: count = 0
// Hasil: count = 1 (harusnya 2!)
```

Dengan cara 2, Zustand memberikan state terkini sebelum setiap update:

```ts
set((state) => ({ count: state.count + 1 })) // state.count = 0 → 1
set((state) => ({ count: state.count + 1 })) // state.count = 1 → 2
// Hasil: count = 2 ✅
```

> **Aturan praktis:** kalau action melibatkan nilai lama (increment, append to array, toggle), selalu gunakan functional update.

---

## Bagian 4 — Parameter Kedua `set`: Replace Mode

`set` menerima parameter kedua opsional: boolean `replace`.

```ts
set(newState, replace)
//             ↑ default: false (merge)
//               kalau true: ganti seluruh state
```

Secara default `replace` adalah `false` (merge). Kalau kamu set `true`, state kamu **diganti seluruhnya** dengan object yang kamu berikan.

```ts
// Merge (default) — field lain tetap ada
set({ count: 0 })           // atau: set({ count: 0 }, false)

// Replace — field lain HILANG
set({ count: 0 }, true)     // state hanya berisi { count: 0 }
```

Kapan `replace: true` dipakai? Jarang sekali. Contoh valid: action `resetAll` yang memang ingin membuang semua state dan kembali ke kondisi awal.

```ts
const initialState = { count: 0, name: '', isLoading: false };

const useStore = create<MyStore>((set) => ({
  ...initialState,

  resetAll: () => set(initialState, true), // ganti semua dengan initial state
}));
```

---

## Bagian 5 — Parameter Ketiga `set`: Nama Action

```ts
set(newState, replace, 'nama-action')
```

Parameter ketiga adalah string yang menjadi nama action di Redux DevTools. Dibahas lengkap di [08-devtools.md](./08-devtools.md). Untuk saat ini cukup tahu bahwa ini ada.

---

## Bagian 6 — Fungsi `get`: Membaca State di Dalam Action

Ada kalanya sebuah action perlu **membaca state yang lain** sebelum melakukan sesuatu.

Contoh: action `deleteProduct` perlu cek dulu apakah product dengan ID tersebut benar-benar ada sebelum menghapus.

```ts
deleteProduct: (id: string) => {
  // Perlu baca state dulu, baru set
  const exists = ??? .products.some((p) => p.id === id);
  if (!exists) {
    // beri tahu: product tidak ditemukan
    return;
  }
  set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  }));
},
```

Bisa pakai `state` di dalam `set` untuk membaca? Bisa, tapi hanya setelah `set` dipanggil — tidak bisa sebelumnya.

Solusinya: gunakan `get()`.

```ts
const useProductStore = create<ProductStore>((set, get) => ({
  products: [],

  deleteProduct: (id: string) => {
    const exists = get().products.some((p) => p.id === id); // ← baca state
    if (!exists) {
      set({ error: 'Product tidak ditemukan' });
      return;
    }

    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
      error: null,
    }));
  },
}));
```

`get()` mengembalikan **seluruh state saat ini** sebagai object. Kamu bisa membaca field apapun darinya.

---

## Bagian 7 — Perbedaan `get()` vs Parameter `state` di `set`

Keduanya memberikan akses ke state, tapi beda konteks:

```ts
// get() — bisa dipanggil kapan saja di dalam action
deleteProduct: (id) => {
  const state = get();        // ← bisa dipanggil di awal
  if (!state.products.find(p => p.id === id)) return;
  set(...);
},

// state di dalam set — hanya tersedia saat set dipanggil
deleteProduct: (id) => {
  set((state) => {            // ← state hanya tersedia di sini
    const exists = state.products.some(p => p.id === id);
    if (!exists) return {};   // tidak bisa "return nothing" dengan mudah
    return { products: state.products.filter(p => p.id !== id) };
  });
},
```

Pakai `get()` ketika kamu perlu membaca state **sebelum** memutuskan apakah akan memanggil `set` atau tidak. Pakai `state` di dalam `set` ketika kamu hanya perlu nilai lama untuk menghitung nilai baru.

---

## Bagian 8 — Anti-Pattern: Multiple `set` Berurutan

```ts
// ❌ JANGAN — dua set terpisah = dua kali re-render
fetchData: async () => {
  set({ isLoading: true });
  set({ error: null });
  // ...
},
```

Setiap panggilan `set` memicu satu siklus re-render di semua subscriber. Dua `set` berurutan = dua re-render.

```ts
// ✅ BENAR — gabung dalam satu set = satu re-render
fetchData: async () => {
  set({ isLoading: true, error: null });
  // ...
},
```

Satu `set` = satu re-render. Selalu gabungkan `set` yang terjadi bersamaan.

---

## Ringkasan

| Fungsi | Kegunaan | Kapan dipakai |
|---|---|---|
| `set(obj)` | Update state (merge) | Selalu |
| `set(fn)` | Update berdasarkan state lama | Ketika nilai baru bergantung pada nilai lama |
| `set(obj, true)` | Replace seluruh state | Jarang — hanya untuk reset total |
| `get()` | Baca state saat ini | Sebelum memutuskan apakah perlu `set` |
