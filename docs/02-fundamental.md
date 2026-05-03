# Fundamental Zustand

> Tiga konsep inti yang harus kamu pahami sebelum menulis satu baris pun kode Zustand.

---

## Bagian 1 — Tiga Konsep: Store, State, Action

Zustand dibangun di atas tiga konsep sederhana. Kalau kamu sudah ngerti tiga ini, sisanya hanya detail teknis.

**Store** adalah "wadah" tempat semua data dan logika disimpan. Satu store bisa berisi banyak data. Store dibuat sekali dan hidup selama aplikasi berjalan.

**State** adalah data itu sendiri. Angka, teks, array, objek — apapun yang kamu simpan. State adalah kondisi saat ini dari sesuatu.

**Action** adalah fungsi yang mengubah state. State tidak boleh diubah sembarangan dari luar — perubahan harus melalui action yang ada di dalam store.

**Analogi:**

Bayangkan store adalah sebuah **rekening bank**:
- State = saldo saat ini (misal: Rp 500.000)
- Action = operasi yang bisa dilakukan: setor, tarik, transfer

Kamu tidak bisa langsung mengubah angka di buku rekening. Semua perubahan harus lewat operasi resmi (setor, tarik). Ini membuat setiap perubahan tercatat dan bisa dilacak.

---

## Bagian 2 — Instalasi

```bash
npm install zustand
```

Hanya itu. Tidak ada peer dependency, tidak ada setup tambahan.

---

## Bagian 3 — Store Pertama: Counter

Mari buat store paling sederhana yang bisa dibayangkan: sebuah counter.

```ts
// src/store/counterStore.ts
import { create } from 'zustand';

// Langkah 1: definisikan bentuk state + action menggunakan TypeScript type
type CounterStore = {
  // STATE — data yang disimpan
  count: number;

  // ACTION — fungsi yang mengubah state
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

// Langkah 2: buat store menggunakan fungsi create()
export const useCounterStore = create<CounterStore>((set) => ({
  // nilai awal state
  count: 0,

  // implementasi action
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

Mari bedah baris per baris.

---

## Bagian 4 — Bedah `create()`

```ts
export const useCounterStore = create<CounterStore>((set) => ({
  //...
}));
```

`create` adalah fungsi dari Zustand. Ia menerima satu argumen: sebuah callback function.

Callback ini menerima parameter `set` — ini adalah fungsi untuk **mengubah state**.

Callback harus **mengembalikan object** yang berisi state awal dan semua action.

Hasil dari `create` adalah sebuah **custom hook** (namanya `useCounterStore`). Hook inilah yang nanti dipakai di komponen React.

Kenapa hasilnya hook? Karena untuk berkomunikasi dengan React (memicu re-render ketika state berubah), Zustand perlu hidup dalam sistem React. Hook adalah cara resmi untuk itu.

---

## Bagian 5 — Bedah `set()`

```ts
increment: () => set((state) => ({ count: state.count + 1 })),
```

`set` adalah fungsi yang kamu gunakan untuk mengubah state. Ada dua cara memanggilnya:

**Cara 1 — Functional update (pakai state sebelumnya):**

```ts
set((state) => ({ count: state.count + 1 }))
//   ↑ state saat ini    ↑ nilai baru yang dikembalikan
```

Gunakan cara ini ketika nilai baru bergantung pada nilai lama. Zustand menjamin bahwa `state` di sini adalah nilai terkini — tidak ada masalah race condition.

**Cara 2 — Direct update (nilai langsung):**

```ts
set({ count: 0 })
```

Gunakan cara ini ketika nilai baru tidak bergantung pada nilai lama. Lebih singkat.

> **Penting:** `set` melakukan **merge**, bukan replace. Artinya kalau store kamu punya 10 field dan kamu hanya `set({ count: 0 })`, 9 field lainnya tetap utuh. Ini berbeda dengan `setState` di class component React yang juga merge, tapi berbeda dengan `useState` yang replace total.

Detail lengkap tentang `set` ada di dokumen [04-set-dan-get.md](./04-set-dan-get.md).

---

## Bagian 6 — Menggunakan Store di Komponen

Store yang sudah dibuat bisa langsung dipakai di komponen React:

```tsx
// src/components/Counter.tsx
import { useCounterStore } from '../store/counterStore';

export function Counter() {
  // Ambil hanya yang dibutuhkan menggunakan selector
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);
  const reset = useCounterStore((state) => state.reset);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

Perhatikan pola `useCounterStore((state) => state.count)` — ini disebut **selector**. Kamu tidak mengambil seluruh store, tapi memilih field spesifik yang kamu butuhkan.

Kenapa begini? Karena kalau kamu ambil seluruh store, komponen akan re-render setiap kali **field apapun** di store berubah — termasuk yang tidak kamu pakai. Dengan selector, komponen hanya re-render kalau field yang dipilih berubah.

Penjelasan lengkap ada di [05-selector-dan-shallow.md](./05-selector-dan-shallow.md).

---

## Bagian 7 — Tidak Perlu Provider

Perhatikan bahwa kamu tidak perlu membungkus aplikasi dengan `<Provider>` seperti di Redux atau Context API.

```tsx
// Dengan Context API / Redux — perlu Provider di atas
function App() {
  return (
    <StoreProvider>  {/* ← ini tidak perlu di Zustand */}
      <Counter />
    </StoreProvider>
  );
}

// Dengan Zustand — langsung pakai
function App() {
  return <Counter />;
}
```

Store Zustand hidup di luar pohon komponen React. Ia bisa diakses dari mana saja tanpa setup Provider.

---

## Bagian 8 — Konvensi Penamaan

Beberapa konvensi yang konsisten dipakai dalam codebase Zustand:

| Yang diberi nama | Konvensi | Contoh |
|---|---|---|
| Hook store | `use` + nama domain + `Store` | `useCartStore`, `useAuthStore` |
| Type store | nama domain + `Store` | `CartStore`, `AuthStore` |
| File store | nama domain + `Store.ts` | `cartStore.ts`, `authStore.ts` |
| Action | kata kerja yang jelas | `addItem`, `removeUser`, `fetchProducts` |

---

## Bagian 9 — Struktur File Awal

Untuk memulai, cukup gunakan struktur ini:

```
src/
├── store/
│   └── counterStore.ts    ← store beserta type-nya
└── components/
    └── Counter.tsx         ← komponen yang pakai store
```

Untuk project yang lebih besar, kamu perlu memisahkan type ke file tersendiri dan mengatur ulang folder. Itu dibahas di [11-arsitektur.md](./11-arsitektur.md).
