# Subscribe — Akses Store di Luar React

> Hook hanya bisa dipakai di dalam komponen React. Tapi ada kalanya kamu perlu membaca atau mendengarkan perubahan store dari luar React — dari modul utility, event listener, atau kode non-React lainnya.

---

## Bagian 1 — Masalah: Hook Tidak Bisa Dipakai di Luar Komponen

Aturan React yang tidak bisa dilanggar: **hooks hanya bisa dipanggil di dalam komponen React atau custom hook lainnya**.

```ts
// ✅ Di dalam komponen — boleh
function Counter() {
  const count = useCounterStore((state) => state.count);
  return <p>{count}</p>;
}

// ❌ Di luar komponen — error!
const count = useCounterStore((state) => state.count);
// → Error: "Invalid hook call. Hooks can only be called inside of the body of a function component."
```

Tapi ada use case yang valid di mana kamu perlu akses store di luar komponen:
- Modul analytics yang merekam perubahan state
- Logger yang mencatat setiap action untuk debugging
- Integrasi dengan library non-React (chart library, WebSocket, dll)
- Action yang dipanggil dari event listener DOM
- Testing unit tanpa render komponen

---

## Bagian 2 — `getState()`: Baca State di Luar React

Setiap store Zustand punya method `.getState()` yang bisa dipanggil dari mana saja.

```ts
// counterStore.ts
export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// Di mana saja — BUKAN di dalam komponen
import { useCounterStore } from './store/counterStore';

// Baca state saat ini
const currentCount = useCounterStore.getState().count;

// Baca action dan panggil
useCounterStore.getState().increment();
```

`getState()` selalu mengembalikan **snapshot** state saat dipanggil. Nilainya tidak otomatis ter-update kalau state berubah setelah itu.

```ts
const count1 = useCounterStore.getState().count; // misal: 5
useCounterStore.getState().increment();
const count2 = useCounterStore.getState().count; // 6 — harus panggil lagi

// count1 tetap 5 — ini adalah snapshot, bukan reference live
```

---

## Bagian 3 — `setState()`: Update State di Luar React

Selain membaca, kamu juga bisa mengubah state dari luar React menggunakan `.setState()`.

```ts
// Langsung set nilai
useCounterStore.setState({ count: 0 });

// Atau dengan functional update (berdasarkan state sebelumnya)
useCounterStore.setState((state) => ({ count: state.count + 10 }));
```

Cara kerjanya sama persis dengan `set` di dalam action — merge, bukan replace, kecuali kamu set `replace: true`.

**Kapan berguna?**

Contoh: kamu punya service yang menerima data dari WebSocket. Ketika data baru tiba, kamu update store langsung dari handler WebSocket.

```ts
// websocketService.ts — tidak ada React di sini
import { useProductStore } from '../store/productStore';

const socket = new WebSocket('wss://api.example.com/updates');

socket.onmessage = (event) => {
  const update = JSON.parse(event.data);

  if (update.type === 'product_updated') {
    useProductStore.setState((state) => ({
      products: state.products.map((p) =>
        p.id === update.product.id ? update.product : p
      ),
    }));
  }
};
```

Semua komponen yang subscribe ke `products` akan otomatis re-render ketika `setState` dipanggil — persis seperti kalau action dipanggil dari dalam komponen.

---

## Bagian 4 — `subscribe()`: Dengarkan Perubahan

`subscribe()` memungkinkan kamu menjalankan callback setiap kali state berubah.

```ts
// Mendengarkan SETIAP perubahan di store
const unsubscribe = useCounterStore.subscribe((state) => {
  console.log('State berubah:', state.count);
});

// PENTING: selalu simpan dan panggil unsubscribe ketika tidak lagi dibutuhkan
// Kalau tidak, ini menjadi memory leak
unsubscribe();
```

Callback menerima dua parameter: state baru dan state lama.

```ts
const unsubscribe = useCounterStore.subscribe((newState, prevState) => {
  console.log('Dari:', prevState.count, '→ ke:', newState.count);
});
```

**Peringatan:** `subscribe()` tanpa selector mendengarkan **setiap perubahan** di store. Kalau store punya banyak field yang sering berubah, callback ini akan sering dipanggil.

---

## Bagian 5 — `subscribeWithSelector`: Dengarkan Field Tertentu

Untuk mendengarkan perubahan pada **field spesifik**, gunakan middleware `subscribeWithSelector`.

Middleware ini menambahkan kemampuan selector ke method `subscribe()`.

```ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useProductStore = create<ProductState>()(
  subscribeWithSelector((set) => ({
    products: [],
    searchQuery: '',
    selectedId: null,
    // ...
  }))
);

// Subscribe hanya ke searchQuery
const unsubscribe = useProductStore.subscribe(
  (state) => state.searchQuery,     // selector — ambil field yang ingin didengarkan
  (searchQuery, prevSearchQuery) => { // callback — dipanggil hanya saat searchQuery berubah
    console.log('Search query berubah:', prevSearchQuery, '→', searchQuery);
    // Contoh: kirim ke analytics
    analytics.track('search', { query: searchQuery });
  }
);
```

Callback hanya dipanggil ketika nilai yang dikembalikan selector **berubah** — bukan setiap kali store berubah. Jauh lebih efisien.

---

## Bagian 6 — Contoh Nyata: Analytics Module

```ts
// src/analytics/productAnalytics.ts
import { useProductStore } from '../features/products/store/productStore';
import { subscribeWithSelector } from 'zustand/middleware';

// Panggil ini sekali saat aplikasi startup (misal: di main.tsx)
export function initProductAnalytics() {
  // Rekam setiap kali user mencari
  const unsubSearch = useProductStore.subscribe(
    (state) => state.searchQuery,
    (query) => {
      if (query.length > 2) {
        sendAnalyticsEvent('product_search', { query });
      }
    }
  );

  // Rekam setiap kali produk dipilih
  const unsubSelect = useProductStore.subscribe(
    (state) => state.selectedId,
    (id, prevId) => {
      if (id && id !== prevId) {
        const product = useProductStore.getState().products.find(p => p.id === id);
        sendAnalyticsEvent('product_view', { productId: id, name: product?.name });
      }
    }
  );

  // Kembalikan fungsi cleanup
  return () => {
    unsubSearch();
    unsubSelect();
  };
}
```

---

## Bagian 7 — `subscribe` di Dalam `useEffect`

Kalau kamu perlu `subscribe` dari dalam komponen React (tapi tidak ingin menyebabkan re-render), gunakan `useEffect`:

```tsx
import { useEffect } from 'react';
import { useProductStore } from '../store/productStore';

function ProductLogger() {
  useEffect(() => {
    const unsubscribe = useProductStore.subscribe(
      (state) => state.products.length,
      (count) => {
        console.log('Jumlah produk:', count);
      }
    );

    // Cleanup — WAJIB! Kalau tidak, subscribe terus berjalan
    // bahkan setelah komponen di-unmount → memory leak
    return unsubscribe;
  }, []); // dependency kosong — subscribe sekali saat mount

  return null;
}
```

---

## Ringkasan

| Method | Kegunaan | Di dalam React? |
|---|---|---|
| `useStore(selector)` | Baca state + auto re-render | Hanya dalam komponen/hook |
| `useStore.getState()` | Baca snapshot state | Di mana saja |
| `useStore.setState()` | Update state | Di mana saja |
| `useStore.subscribe(fn)` | Dengarkan semua perubahan | Di mana saja — ingat cleanup! |
| `useStore.subscribe(selector, fn)` | Dengarkan perubahan field tertentu | Di mana saja — butuh `subscribeWithSelector` |

> **Aturan:** selalu simpan return value dari `subscribe()` dan panggil saat tidak dibutuhkan lagi. Lupa melakukan ini adalah sumber memory leak yang paling umum di Zustand.
