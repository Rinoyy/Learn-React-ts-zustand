# Middleware: `devtools`

> Tanpa devtools, kamu harus `console.log` ke mana-mana untuk tahu apa yang terjadi di store. Dengan devtools, kamu bisa memantau setiap perubahan state langsung dari browser.

---

## Bagian 1 — Masalah: State Tidak Terlihat

Saat mengembangkan aplikasi, kamu perlu tahu:
- State apa yang ada di store saat ini?
- Apa yang berubah setelah user klik tombol itu?
- Action mana yang menyebabkan bug ini?

Tanpa alat bantu, cara yang biasa adalah `console.log` di action:

```ts
createProduct: (input) => {
  console.log('Sebelum:', get().products); // debug
  set((state) => ({ products: [...state.products, newProduct] }));
  console.log('Sesudah:', get().products); // debug
},
```

Ini berantakan, tidak efisien, dan harus dihapus sebelum commit. Ada cara yang jauh lebih baik.

---

## Bagian 2 — Redux DevTools Extension

`devtools` adalah middleware Zustand yang menghubungkan store ke **Redux DevTools Extension** — sebuah browser extension yang bisa memantau state secara visual.

Apa yang bisa kamu lihat di Redux DevTools:
- **State tree saat ini** — semua field di store secara real-time
- **Action log** — daftar semua action yang sudah terjadi, berurutan
- **Diff per action** — tepat field apa yang berubah dari state sebelumnya
- **Time travel** — klik action lama untuk "mundur" ke kondisi state saat itu

Install extension-nya dulu:
- Chrome: cari "Redux DevTools" di Chrome Web Store
- Firefox: cari "Redux DevTools" di Firefox Add-ons

Setelah install, tab "Redux DevTools" muncul di DevTools browser (F12).

---

## Bagian 3 — Cara Menggunakan `devtools`

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useCounterStore = create<CounterStore>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }),
    { name: 'CounterStore' }  // nama yang muncul di DevTools
    //  ↑ kalau punya banyak store, nama ini membedakannya
  )
);
```

Buka aplikasi di browser, buka DevTools → tab Redux DevTools. Pilih "CounterStore" di dropdown. Setiap kali kamu klik +/- di UI, perubahan langsung muncul di panel.

---

## Bagian 4 — Nama Action: Parameter Ketiga `set`

Secara default, setiap `set` yang dipanggil muncul di DevTools sebagai `"anonymous"`. Tidak informatif.

Kamu bisa memberi nama pada setiap `set` menggunakan **parameter ketiga**:

```ts
set(newState, replace, 'nama-action')
//                      ↑ string ini muncul di DevTools
```

Contoh dengan nama action yang bermakna:

```ts
const useProductStore = create<ProductStore>()(
  devtools(
    (set, get) => ({
      products: [],
      error: null,

      createProduct: (input) => {
        const validationError = validate(input);
        if (validationError) {
          set({ error: validationError }, false, 'products/create/validation-error');
          return null;
        }
        const product = buildProduct(input);
        set(
          (state) => ({ products: [...state.products, product], error: null }),
          false,
          'products/create/success'
        );
        return product;
      },

      deleteProduct: (id) => {
        const exists = get().products.some((p) => p.id === id);
        if (!exists) {
          set({ error: 'Produk tidak ditemukan' }, false, 'products/delete/not-found');
          return false;
        }
        set(
          (state) => ({ products: state.products.filter((p) => p.id !== id) }),
          false,
          'products/delete/success'
        );
        return true;
      },
    }),
    { name: 'ProductStore' }
  )
);
```

Di DevTools, action log akan terlihat seperti:

```
products/create/success      ← produk berhasil ditambah
products/delete/not-found    ← ada yang coba hapus produk yang tidak ada
products/create/validation-error  ← input tidak valid
products/delete/success      ← produk berhasil dihapus
```

Kamu bisa baca alur kejadian seperti membaca log. Sangat berguna untuk debugging.

---

## Bagian 5 — Konvensi Penamaan Action

Konvensi `"entitas/operasi/hasil"` dipinjam dari Redux:

```
products/create/success
products/create/validation-error
products/update/not-found
products/update/success
products/delete/success
cart/add-item
cart/remove-item
cart/clear
auth/login/success
auth/login/error
auth/logout
```

Tidak ada aturan wajib, tapi pola ini memudahkan filtering di DevTools ketika action log sudah panjang.

---

## Bagian 6 — Stack `devtools` dengan `persist`

Ketika menggunakan keduanya, urutan wrapping penting:

```ts
// ✅ BENAR — devtools di luar, persist di dalam
create<State>()(
  devtools(
    persist(
      (set) => ({ ... }),
      { name: 'my-storage' }
    ),
    { name: 'MyStore' }
  )
)
```

```ts
// ❌ SALAH — persist di luar, devtools di dalam
create<State>()(
  persist(
    devtools(
      (set) => ({ ... }),
      { name: 'MyStore' }
    ),
    { name: 'my-storage' }
  )
)
```

Kenapa `devtools` harus di luar? Karena `devtools` membungkus **semua yang ada di dalamnya** — termasuk `persist`. Dengan urutan yang benar, DevTools bisa melihat event hydration dari `persist` (ketika data dibaca dari localStorage saat halaman dibuka).

Kalau dibalik, DevTools hanya melihat wrapper `persist`, bukan action-action nyata yang terjadi di dalamnya.

> **Aturan**: `devtools` selalu jadi lapisan **paling luar** dalam stack middleware.

---

## Bagian 7 — Matikan di Production

DevTools harus dimatikan di production. Ada dua cara:

**Cara 1 — Otomatis (recommended):** `devtools` secara default sudah tidak aktif di production build jika `process.env.NODE_ENV === 'production'`. Vite dan Create React App meng-handle ini otomatis.

**Cara 2 — Eksplisit:**

```ts
devtools(
  (set) => ({ ... }),
  {
    name: 'MyStore',
    enabled: process.env.NODE_ENV !== 'production', // ← eksplisit
  }
)
```

---

## Ringkasan

| Konsep | Penjelasan |
|---|---|
| Kenapa devtools | Pantau state dan action tanpa `console.log` |
| Instalasi | Browser extension "Redux DevTools" |
| `{ name }` | Nama store di dropdown DevTools |
| Parameter ketiga `set` | Label action di DevTools — gunakan pola `entitas/operasi/hasil` |
| Urutan stack | `devtools` selalu paling luar |
| Production | Dimatikan otomatis di production build |
