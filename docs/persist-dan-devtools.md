# Memahami `persist` dan `devtools` di Zustand

> Dokumen ini menjelaskan dua konsep penting: menyimpan state ke localStorage dengan `persist`, dan memantau perubahan state dengan `devtools`. Semua dijelaskan dari akar masalahnya, bukan langsung ke solusi.

---

## Bagian 1 — Masalah Awal: Data Hilang Saat Refresh

Bayangkan kamu punya toko online sederhana. Kamu tambah 3 produk lewat form. Lalu kamu tekan **F5** (refresh halaman).

**Produk-produknya hilang.**

Kenapa? Karena Zustand menyimpan state di **memori JavaScript** — tepatnya di RAM browser. Begitu halaman di-refresh, browser membuang semua memori JavaScript yang lama dan mulai dari nol. State Zustand ikut lenyap.

Ini bukan bug. Ini memang cara kerja JavaScript di browser.

```
[ Browser dibuka ]
     ↓
[ JavaScript jalan → Zustand store dibuat → state = { products: [] } ]
     ↓
[ Kamu tambah produk → state = { products: [A, B, C] } ]
     ↓
[ F5 ditekan ]
     ↓
[ Semua memori JS dihapus ]
     ↓
[ JavaScript jalan lagi → Zustand store dibuat ulang → state = { products: [] } ]
```

State kembali ke kondisi awal. Data `[A, B, C]` hilang selamanya.

---

## Bagian 2 — Apa Itu localStorage?

Sebelum bicara solusi, kita harus paham dulu tempat penyimpanannya.

`localStorage` adalah tempat penyimpanan data di browser yang:

- **Permanen** — tidak ikut hilang saat halaman di-refresh atau browser ditutup
- **Per domain** — data dari `localhost:5173` tidak bisa diakses oleh `example.com`
- **String only** — hanya bisa menyimpan teks, bukan objek JavaScript langsung
- **Sinkron** — operasi baca/tulis tidak butuh `async/await`
- **Kapasitas** — sekitar 5–10 MB per domain, lebih dari cukup untuk data produk

Kamu bisa coba sendiri di browser. Buka DevTools → tab **Application** → **Local Storage**.

Coba jalankan ini di Console browser:

```js
// Menyimpan data
localStorage.setItem("nama", "Rino")

// Membaca data
localStorage.getItem("nama") // → "Rino"

// Menghapus data
localStorage.removeItem("nama")
```

Sekarang coba simpan sebuah objek:

```js
const produk = { id: "1", name: "Baju", price: 50000 }

// SALAH — objek langsung tidak bisa disimpan
localStorage.setItem("produk", produk)
localStorage.getItem("produk") // → "[object Object]" ← ini teks, bukan objek!
```

Masalah. localStorage hanya menerima string. Solusinya adalah mengubah objek menjadi string JSON dulu:

```js
// BENAR — ubah ke JSON string dulu
localStorage.setItem("produk", JSON.stringify(produk))

// Saat membaca, ubah balik dari string ke objek
const hasil = JSON.parse(localStorage.getItem("produk"))
// → { id: "1", name: "Baju", price: 50000 }
```

Proses ini disebut **serialisasi** (objek → string) dan **deserialisasi** (string → objek).

Inilah yang dilakukan `persist` secara otomatis di balik layar.

---

## Bagian 3 — Solusi: Middleware `persist`

Zustand menyediakan middleware bernama `persist` yang menghubungkan store ke localStorage secara otomatis. Setiap kali state berubah, `persist` langsung menyimpannya ke localStorage. Saat halaman di-refresh, `persist` membaca kembali data dari localStorage dan mengisi ulang store.

Alurnya:

```
[ State berubah (produk ditambah) ]
     ↓
[ persist mendeteksi perubahan ]
     ↓
[ JSON.stringify(state) → disimpan ke localStorage ]

---

[ Halaman di-refresh ]
     ↓
[ Zustand store dibuat → state awal = { products: [] } ]
     ↓
[ persist membaca dari localStorage → JSON.parse(data) ]
     ↓
[ State diisi ulang → state = { products: [A, B, C] } ]
```

---

## Bagian 4 — Bedah Konfigurasi `persist`

Di file `productStore.ts`, bagian ini adalah konfigurasi `persist`:

```ts
{
  name: "product-storage",
  storage: createJSONStorage(() => localStorage),
  version: 1,
  partialize: (state) => ({ products: state.products }),
}
```

Mari kita bedah satu per satu.

---

### 4.1 — `name: "product-storage"`

Ini adalah **nama kunci (key)** yang digunakan di localStorage.

localStorage bekerja seperti kamus (dictionary). Setiap data disimpan dengan pasangan `key → value`. Properti `name` ini menentukan nama key-nya.

Kamu bisa lihat hasilnya di browser:

1. Buka DevTools → **Application** → **Local Storage** → `localhost:5173`
2. Cari baris dengan key bernama `product-storage`
3. Value-nya adalah teks JSON panjang berisi state produk kamu

```
localStorage = {
  "product-storage": '{"state":{"products":[...]},"version":1}'
}
```

Kalau kamu ganti `name` menjadi `"produk-saya"`, maka key di localStorage juga berubah menjadi `"produk-saya"`. Data lama di key `"product-storage"` tidak terbaca lagi — efeknya seperti reset.

Pilih nama yang deskriptif dan unik supaya tidak bentrok dengan key localStorage dari library lain.

---

### 4.2 — `storage: createJSONStorage(() => localStorage)`

Ini menentukan **di mana dan bagaimana** data disimpan.

`createJSONStorage` adalah helper dari Zustand yang membungkus storage engine (dalam hal ini `localStorage`) dengan kemampuan JSON. Tugasnya:

- Saat **menyimpan**: memanggil `JSON.stringify` sebelum menulis ke localStorage
- Saat **membaca**: memanggil `JSON.parse` setelah membaca dari localStorage

Kenapa ada `() => localStorage` (fungsi), bukan langsung `localStorage`? Ini untuk menghindari error di lingkungan yang tidak punya `localStorage`, seperti server-side rendering (Next.js). Dengan membungkusnya dalam fungsi, `localStorage` baru diakses saat benar-benar dibutuhkan, bukan saat modul dimuat.

Kalau kamu mau simpan di `sessionStorage` (data hilang saat tab ditutup), kamu tinggal ganti:

```ts
// localStorage → data permanen
storage: createJSONStorage(() => localStorage)

// sessionStorage → data hilang saat tab ditutup
storage: createJSONStorage(() => sessionStorage)
```

---

### 4.3 — `version: 1`

Ini adalah **nomor versi** dari struktur data yang kamu simpan.

Bayangkan kamu sudah deploy aplikasi. Ada user yang sudah pakai selama 1 bulan, localStorage mereka sudah berisi data produk. Tiba-tiba kamu mengubah struktur `Product` — misalnya menambah field `category`.

```ts
// Versi lama (yang ada di localStorage user)
{ id: "1", name: "Baju", price: 50000 }

// Versi baru (setelah update kode)
{ id: "1", name: "Baju", price: 50000, category: "Fashion" }
```

Data lama tidak punya field `category`. Kalau dibaca tanpa penanganan, bisa menyebabkan bug.

`version` digunakan bersama `migrate` untuk menangani perbedaan ini. Kalau `version` di localStorage tidak cocok dengan `version` di kode, Zustand tahu bahwa data itu sudah usang.

Saat ini di kode kamu, `migrate` belum ditulis — artinya kalau versi tidak cocok, Zustand akan mengabaikan data lama dan mulai dari kosong. Ini perilaku default yang aman.

Kapan naikkan versi? Setiap kali kamu mengubah struktur data yang disimpan (menambah/menghapus field dari state yang di-persist).

---

### 4.4 — `partialize: (state) => ({ products: state.products })`

Ini adalah **filter** — menentukan **bagian mana dari state yang disimpan** ke localStorage.

`partialize` adalah sebuah fungsi. Ia menerima seluruh state dan harus mengembalikan **hanya bagian yang mau disimpan**.

State penuh di store kamu adalah:

```ts
{
  products: Product[],   // ← data produk
  error: string | null,  // ← pesan error sementara

  createProduct: ...,    // ← fungsi
  updateProduct: ...,    // ← fungsi
  deleteProduct: ...,    // ← fungsi
  clearError: ...,       // ← fungsi
  resetAll: ...,         // ← fungsi
}
```

Kalau kamu simpan semua ke localStorage, ada dua masalah:
1. **Fungsi tidak bisa di-serialize ke JSON** — `JSON.stringify` akan mengabaikan/merusak fungsi
2. **`error`** tidak perlu disimpan — error itu state sementara, tidak relevan setelah refresh

Dengan `partialize`, kamu bilang: *"Dari semua state ini, simpan hanya `products`."*

```ts
partialize: (state) => ({ products: state.products })
// Hasilnya yang masuk localStorage hanya:
// { products: [...] }
```

Saat halaman di-refresh dan data dibaca kembali, Zustand akan merge data dari localStorage dengan initial state, sehingga:
- `products` → diisi dari localStorage
- `error` → tetap `null` (dari initial state)
- semua fungsi → tetap ada (dibuat ulang oleh Zustand)

---

## Bagian 5 — Apa Itu `devtools`?

Sejauh ini kita sudah bisa **menyimpan data** (dengan `persist`). Tapi bagaimana kita **memantau perubahan state** saat development?

Masalahnya: kamu tidak bisa "melihat" isi Zustand store secara langsung dari browser. Kamu harus `console.log` di sana-sini, yang berantakan dan tidak efisien.

Solusinya adalah `devtools` — middleware Zustand yang menghubungkan store ke **Redux DevTools Extension**, sebuah browser extension yang menampilkan:
- State saat ini
- Setiap perubahan state yang terjadi
- Nama action yang memicu perubahan
- Kemampuan "time travel" (mundur ke state sebelumnya)

---

## Bagian 6 — Bedah Konfigurasi `devtools`

Di kode kamu:

```ts
devtools(
  persist(...),
  { name: "ProductStore" }
)
```

Konfigurasinya sederhana: `{ name: "ProductStore" }`.

Ini adalah nama yang tampil di panel DevTools. Kalau kamu punya beberapa store (misalnya `CartStore`, `AuthStore`), nama ini membedakan mereka di panel.

---

## Bagian 7 — Nama Action: `"products/create/success"`

Ini adalah bagian yang paling elegant di kode kamu. Mari kita bedah.

Setiap kali kamu memanggil `set(...)` di Zustand, state berubah. Tapi tanpa nama, DevTools hanya menampilkan `"anonymous"` — tidak informatif sama sekali.

Parameter ketiga di `set` adalah nama action:

```ts
set(newState, replace, "nama-action")
//            ↑         ↑
//            false      nama yang muncul di DevTools
```

Di kode kamu, setiap operasi punya nama yang bermakna:

```ts
set({ error: validationError }, false, "products/create/error")
// → Artinya: ada percobaan create produk, tapi gagal karena validasi

set((state) => ({ products: [...state.products, product] }), false, "products/create/success")
// → Artinya: create produk berhasil

set({ error: "Product not found" }, false, "products/update/notfound")
// → Artinya: update gagal karena produk tidak ditemukan

set((state) => ({ products: state.products.map(...) }), false, "products/update/success")

set({ error: "Product not found" }, false, "products/delete/notfound")

set((state) => ({ products: state.products.filter(...) }), false, "products/delete/success")

set({ error: null }, false, "products/clearError")

set({ products: [], error: null }, false, "products/resetAll")
```

Konvensi penamaan `"entitas/operasi/hasil"` ini dipinjam dari Redux. Hasilnya di DevTools sangat mudah dibaca — kamu bisa melihat alur kejadian seperti membaca log:

```
products/create/success    ← produk berhasil ditambah
products/update/notfound   ← ada yang coba update produk yang tidak ada
products/delete/success    ← produk berhasil dihapus
```

---

## Bagian 8 — Urutan Wrapping: Mana yang Di Luar?

Di kode kamu:

```ts
create<ProductState>()(
  devtools(        // ← lapisan luar
    persist(       // ← lapisan dalam
      (set, get) => ({ ... }),  // ← store asli
      { /* persist config */ }
    ),
    { name: "ProductStore" }
  )
)
```

Urutan ini penting. `devtools` membungkus `persist`, bukan sebaliknya. Ini artinya `devtools` bisa "melihat" semua yang terjadi termasuk apa yang dilakukan `persist` (seperti saat hydration dari localStorage).

Kalau dibalik — `persist` membungkus `devtools` — action dari proses hydration tidak akan muncul di DevTools.

Aturan umumnya: **`devtools` selalu jadi lapisan paling luar.**

---

## Bagian 9 — Rexus DevTools

Rexus DevTools adalah browser extension (alternatif dari Redux DevTools) yang lebih ringan dan didesain khusus untuk Zustand. Ia bisa membaca data yang dikirim oleh middleware `devtools` dan menampilkannya dengan cara yang lebih bersih.

Yang bisa kamu pantau di Rexus DevTools:

- **State tree saat ini** — isi `products` dan `error` secara real-time
- **Action log** — daftar semua action yang sudah terjadi, misalnya:
  ```
  ✓ products/create/success
  ✓ products/update/success
  ✗ products/delete/notfound
  ```
- **Diff per action** — apa yang berubah dari state sebelumnya ke state setelah action ini
- **Time travel** — klik action lama untuk "mundur" ke kondisi state saat itu (hanya untuk debugging, tidak mengubah localStorage)

Cara menggunakannya:
1. Install Rexus DevTools dari browser extension store
2. Buka aplikasi kamu di browser
3. Buka DevTools → tab **Rexus** (atau nama tabnya di extension)
4. Pilih store **ProductStore** (sesuai `name` di konfigurasi `devtools`)
5. Lakukan operasi di UI — tambah produk, update, hapus
6. Setiap operasi langsung muncul sebagai log dengan nama action yang kamu tulis

---

## Ringkasan

| Konsep | Masalah yang Diselesaikan | Cara Kerja Singkat |
|---|---|---|
| `persist` | Data hilang saat refresh | Simpan state ke localStorage otomatis |
| `name` | Identifier di localStorage | Key untuk baca/tulis di localStorage |
| `storage` | Cara serialisasi data | Bungkus localStorage dengan JSON parser |
| `version` | Perubahan struktur data | Tandai versi agar bisa migrasi |
| `partialize` | Pilih apa yang disimpan | Filter state sebelum masuk localStorage |
| `devtools` | Tidak bisa pantau state | Kirim data ke browser DevTools extension |
| Nama action | Action tidak informatif | Label bermakna untuk setiap `set()` |
| Rexus DevTools | Visualisasi perubahan state | Extension browser untuk baca data dari `devtools` |
