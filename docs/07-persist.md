# Middleware: `persist`

> Secara default, state Zustand hilang saat halaman di-refresh. `persist` adalah solusinya — ia menyambungkan store ke penyimpanan browser secara otomatis.

---

## Bagian 1 — Masalah: State Hilang Saat Refresh

Zustand menyimpan state di **memori JavaScript** — tepatnya di RAM browser. Begitu halaman di-refresh, browser membuang semua memori JavaScript lama dan mulai dari nol. State Zustand ikut lenyap.

```
[ Halaman dibuka ]
  ↓
[ Zustand store dibuat → products: [] ]
  ↓
[ User tambah 3 produk → products: [A, B, C] ]
  ↓
[ F5 ditekan ]
  ↓
[ Semua memori JavaScript dihapus ]
  ↓
[ Zustand dibuat ulang → products: [] ]  ← A, B, C hilang selamanya
```

Ini bukan bug Zustand. Ini cara kerja JavaScript di browser — RAM bersifat sementara.

Untuk menyimpan data yang perlu bertahan (produk, item cart, preferensi user, token login), kita butuh penyimpanan yang **persisten** — yang tidak ikut hilang saat refresh.

---

## Bagian 2 — Mengenal `localStorage`

Sebelum bicara solusi, kamu perlu paham `localStorage` — tempat `persist` menyimpan data.

`localStorage` adalah penyimpanan di browser yang:
- **Permanen** — tidak hilang saat refresh atau browser ditutup (kecuali dihapus manual)
- **Per domain** — data di `localhost:5173` tidak bisa diakses dari `example.com`
- **String only** — hanya bisa menyimpan teks, bukan objek JavaScript langsung
- **Sinkron** — operasi baca/tulis tidak butuh `async/await`
- **Kapasitas** — sekitar 5–10 MB per domain

Coba langsung di Console browser (F12 → Console):

```js
// Simpan data
localStorage.setItem('nama', 'Rino')

// Baca data
localStorage.getItem('nama') // → "Rino"

// Hapus data
localStorage.removeItem('nama')
```

Sekarang coba simpan objek:

```js
const produk = { id: '1', name: 'Baju', price: 50000 }

// ❌ SALAH — objek langsung tidak bisa disimpan
localStorage.setItem('produk', produk)
localStorage.getItem('produk') // → "[object Object]" ← ini teks, bukan objek!
```

Masalah. localStorage hanya menerima string. Solusinya: ubah objek ke JSON string dulu.

```js
// ✅ BENAR
localStorage.setItem('produk', JSON.stringify(produk))

// Saat membaca, ubah balik dari string ke objek
const hasil = JSON.parse(localStorage.getItem('produk'))
// → { id: '1', name: 'Baju', price: 50000 }
```

Proses ini (objek → string) disebut **serialisasi**, kebalikannya (string → objek) disebut **deserialisasi**. Inilah yang dilakukan `persist` di balik layar secara otomatis.

---

## Bagian 3 — Cara Kerja `persist`

`persist` adalah middleware Zustand yang menghubungkan store ke `localStorage` secara otomatis.

Setiap kali state berubah, `persist` langsung menyimpannya. Saat halaman di-refresh, `persist` membaca kembali data dari localStorage dan mengisi ulang store.

```
[ State berubah — produk ditambah ]
  ↓
[ persist mendeteksi perubahan ]
  ↓
[ JSON.stringify(state) → disimpan ke localStorage ]

---

[ Halaman di-refresh ]
  ↓
[ Zustand store dibuat → state awal: products: [] ]
  ↓
[ persist membaca dari localStorage → JSON.parse(data) ]
  ↓
[ State diisi ulang: products: [A, B, C] ]
```

---

## Bagian 4 — Cara Menggunakan `persist`

Ada perubahan sintaks penting ketika menggunakan middleware:

```ts
// Tanpa middleware — sintaks biasa
const useStore = create<MyStore>((set) => ({ ... }));

// Dengan middleware — ada () kosong ekstra sebelum middleware
const useStore = create<MyStore>()(
  //                          ↑↑ wajib ada () ekstra ini
  persist(
    (set) => ({ ... }),
    { name: 'my-storage' }  // konfigurasi persist
  )
);
```

`()` ekstra setelah `create<MyStore>` itu **wajib** kalau menggunakan middleware dengan TypeScript. Tanpa itu, type inference Zustand rusak dan kamu akan dapat error yang membingungkan.

Contoh lengkap:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ProductState = {
  products: Product[];
  error: string | null;
  createProduct: (input: CreateInput) => void;
  deleteProduct: (id: string) => void;
};

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      error: null,
      createProduct: (input) => set((state) => ({
        products: [...state.products, { id: crypto.randomUUID(), ...input }],
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      })),
    }),
    {
      name: 'product-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ products: state.products }),
    }
  )
);
```

---

## Bagian 5 — Bedah Konfigurasi: `name`

```ts
{ name: 'product-storage' }
```

Ini adalah **nama kunci (key)** yang digunakan di localStorage. localStorage bekerja seperti kamus — setiap data disimpan dengan pasangan `key → value`.

Kamu bisa lihat hasilnya di browser: buka DevTools → **Application** → **Local Storage** → `localhost:5173`. Cari baris dengan key `product-storage`.

```
localStorage = {
  "product-storage": '{"state":{"products":[...]},"version":1}'
}
```

Pilih nama yang deskriptif dan unik agar tidak bentrok dengan key dari library lain.

---

## Bagian 6 — Bedah Konfigurasi: `storage`

```ts
storage: createJSONStorage(() => localStorage)
```

Ini menentukan **di mana dan bagaimana** data disimpan.

`createJSONStorage` adalah helper dari Zustand yang membungkus storage engine dengan kemampuan JSON:
- Saat **menyimpan**: panggil `JSON.stringify` sebelum tulis ke localStorage
- Saat **membaca**: panggil `JSON.parse` setelah baca dari localStorage

Kenapa ada `() => localStorage` (fungsi) bukan langsung `localStorage`? Ini untuk menghindari error di lingkungan tanpa `localStorage` (seperti server-side rendering di Next.js). Dengan fungsi, `localStorage` hanya diakses saat benar-benar dibutuhkan.

Alternatif penyimpanan:

```ts
// sessionStorage — data hilang ketika tab/browser ditutup
storage: createJSONStorage(() => sessionStorage)

// Custom storage — misal IndexedDB untuk data besar
storage: createJSONStorage(() => customStorage)
```

---

## Bagian 7 — Bedah Konfigurasi: `partialize`

```ts
partialize: (state) => ({ products: state.products })
```

Ini adalah **filter** — menentukan bagian mana dari state yang disimpan ke localStorage.

State penuh di store biasanya mengandung:
1. Data yang perlu disimpan (products, cart, preferences)
2. State sementara yang tidak perlu disimpan (error, isLoading)
3. Fungsi/action (tidak bisa di-serialize ke JSON)

`partialize` memungkinkan kamu memilih hanya yang perlu:

```ts
// State penuh:
{
  products: Product[],     // ← mau disimpan
  error: string | null,    // ← tidak perlu disimpan (state sementara)
  createProduct: fn,       // ← tidak bisa disimpan (fungsi)
  deleteProduct: fn,       // ← tidak bisa disimpan (fungsi)
}

// Dengan partialize:
partialize: (state) => ({ products: state.products })
// Yang masuk localStorage: { products: [...] }
```

Saat halaman refresh dan data dibaca kembali, Zustand **merge** data dari localStorage dengan initial state:
- `products` → diisi dari localStorage
- `error` → tetap `null` (dari initial state, logis karena error lama tidak relevan)
- Semua fungsi → dibuat ulang oleh Zustand

---

## Bagian 8 — Bedah Konfigurasi: `version` dan Migrasi

```ts
version: 1
```

Ini adalah nomor versi dari struktur data yang disimpan.

**Masalah yang diselesaikan:** bayangkan kamu sudah deploy aplikasi. User sudah memakai selama sebulan, localStorage mereka berisi data produk. Tiba-tiba kamu mengubah struktur `Product` — menambah field baru `category`.

```ts
// Versi lama (yang ada di localStorage user)
{ id: '1', name: 'Baju', price: 50000 }

// Versi baru (setelah update kode)
{ id: '1', name: 'Baju', price: 50000, category: 'Fashion' }
```

Data lama tidak punya field `category`. Kalau dibaca tanpa penanganan, bisa menyebabkan bug atau tampilan yang rusak.

`version` dipakai bersama `migrate` untuk menangani ini:

```ts
persist(
  (set) => ({ ... }),
  {
    name: 'product-storage',
    version: 2,          // naikkan dari 1 ke 2
    migrate: (persistedState: any, fromVersion: number) => {
      // Zustand memanggil ini otomatis ketika versi di localStorage
      // berbeda dari version di kode
      if (fromVersion === 1) {
        // Tambahkan default value untuk field baru
        persistedState.products = persistedState.products.map((p: any) => ({
          ...p,
          category: 'Uncategorized', // default value
        }));
      }
      return persistedState;
    },
  }
)
```

Kalau `version` di localStorage tidak cocok dan tidak ada `migrate`, Zustand secara default akan **mengabaikan** data lama dan mulai dari kosong. Ini aman tapi data user hilang.

> **Kapan naikkan `version`?** Setiap kali kamu mengubah struktur data yang di-persist (tambah field, hapus field, rename field).

---

## Bagian 9 — Hydration: Proses Mengisi Ulang State

Ketika halaman dibuka, ada jeda singkat antara store dibuat (dengan initial state) dan data dari localStorage dibaca. Proses pengisian ulang ini disebut **hydration**.

Ini biasanya tidak terlihat karena sangat cepat. Tapi kadang bisa menyebabkan **flash of content** — komponen sebentar menampilkan state kosong sebelum data dari localStorage masuk.

Untuk menangani ini, `persist` menyediakan helper `useStore.persist.hasHydrated()`:

```tsx
function App() {
  const hasHydrated = useProductStore.persist.hasHydrated();

  if (!hasHydrated) return <p>Memuat data...</p>;

  return <ProductList />;
}
```

Untuk kebanyakan kasus ini tidak diperlukan, tapi berguna kalau kamu mengalami flash content saat aplikasi pertama dibuka.

---

## Ringkasan

| Konfigurasi | Fungsi |
|---|---|
| `name` | Nama key di localStorage |
| `storage` | Engine penyimpanan + cara serialisasi (default: localStorage + JSON) |
| `version` | Nomor versi struktur data — naikkan ketika struktur berubah |
| `migrate` | Fungsi migrasi data lama ke format baru |
| `partialize` | Filter — pilih hanya field yang perlu disimpan |
