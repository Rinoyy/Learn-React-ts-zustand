# Async Action dan Loading State

> Sebagian besar aplikasi nyata butuh data dari server. Bagian ini membahas cara menangani operasi async di Zustand dan pola yang tepat untuk loading, error, dan sukses.

---

## Bagian 1 — Masalah: Data dari Server Tidak Instan

Ketika kamu meminta data dari API (`fetch`, `axios`, dsb), hasilnya tidak langsung tersedia. Ada jeda waktu antara permintaan dikirim dan respons diterima.

Selama jeda waktu itu, aplikasi perlu:
1. Menampilkan indikator loading agar user tahu proses sedang berjalan
2. Menangani kemungkinan error (jaringan mati, server down, dll)
3. Menampilkan data ketika berhasil
4. Kembali ke kondisi normal setelah selesai

Kalau tidak ditangani dengan benar, user akan melihat layar kosong, data stale, atau error yang tidak informatif.

---

## Bagian 2 — Async di Zustand: Tidak Perlu Middleware

Di Redux, untuk menulis action async kamu butuh middleware tambahan (redux-thunk atau redux-saga). Di Zustand, **tidak perlu apa-apa**. Tulis saja fungsi async biasa:

```ts
const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    //           ↑ cukup tambahkan async, langsung jalan
    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Server error: ' + res.status);
      const data = await res.json();
      set({ products: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      set({ error: message, isLoading: false });
    }
  },
}));
```

Zustand tidak peduli apakah action kamu sinkron atau async. Ia hanya peduli kapan `set` dipanggil.

---

## Bagian 3 — Pola `isLoading + error + data`

Ini adalah pola standar untuk state async. Tiga field bekerja bersama:

```ts
type AsyncState<T> = {
  data: T;
  isLoading: boolean;
  error: string | null;
};
```

Alur transisi state:

```
[IDLE]
  ↓ fetchProducts() dipanggil
[isLoading: true, error: null]
  ↓ berhasil
[isLoading: false, data: [...products], error: null]

[IDLE]
  ↓ fetchProducts() dipanggil
[isLoading: true, error: null]
  ↓ gagal
[isLoading: false, data: [], error: "Server error: 500"]
```

Di komponen:

```tsx
function ProductList() {
  const products = useProductStore((s) => s.products);
  const isLoading = useProductStore((s) => s.isLoading);
  const error = useProductStore((s) => s.error);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (isLoading) return <p>Memuat produk...</p>;
  if (error) return <p>Error: {error}</p>;
  if (products.length === 0) return <p>Belum ada produk.</p>;

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

---

## Bagian 4 — Masalah dengan `isLoading + error + data`

Pola di atas punya kelemahan: ada kombinasi state yang tidak masuk akal tapi bisa terjadi.

Misalnya:
- `isLoading: true` dan `error: "Server error"` secara bersamaan — artinya apa?
- `isLoading: false`, `error: null`, `data: []` — apakah ini belum dimuat atau memang kosong?

Bayangkan kamu punya logika di komponen:

```tsx
if (isLoading) return <Spinner />;
if (error) return <ErrorMsg />;
return <ProductTable />;  // ditampilkan bahkan saat belum ada fetch apapun
```

`ProductTable` akan muncul dengan data kosong ketika aplikasi pertama kali dibuka, sebelum `fetchProducts` dipanggil. Bukan perilaku yang diinginkan.

---

## Bagian 5 — Pola Status Enum: Lebih Presisi

Solusinya: ganti `isLoading + error` dengan satu field **`status`** yang nilainya enum.

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';
//             ↑         ↑           ↑           ↑
//          belum mulai  sedang    berhasil    gagal
```

Empat nilai ini **mutually exclusive** (tidak bisa terjadi bersamaan), sehingga tidak ada lagi kombinasi yang tidak masuk akal.

```ts
type ProductState = {
  products: Product[];
  status: Status;
  error: string | null;
  fetchProducts: () => Promise<void>;
};

const useProductStore = create<ProductState>((set) => ({
  products: [],
  status: 'idle',      // ← dimulai dari idle, bukan loading
  error: null,

  fetchProducts: async () => {
    set({ status: 'loading', error: null });

    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Server error: ' + res.status);
      const data = await res.json();
      set({ products: data, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      set({ status: 'error', error: message });
    }
  },
}));
```

Di komponen jadi lebih bersih dan eksplisit:

```tsx
function ProductList() {
  const products = useProductStore((s) => s.products);
  const status = useProductStore((s) => s.status);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  if (status === 'idle')    return null;              // belum ada aksi
  if (status === 'loading') return <Spinner />;       // sedang loading
  if (status === 'error')   return <ErrorBanner />;   // gagal
  // status === 'success'
  return products.length === 0
    ? <p>Belum ada produk.</p>
    : <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Setiap status punya penanganan yang jelas, tidak ada ambiguitas.

---

## Bagian 6 — Async untuk Operasi Mutasi (Create, Update, Delete)

Fetch data bukan satu-satunya operasi async. Operasi mutasi (create, update, delete) juga seringkali async.

Pola yang sama berlaku, dengan sedikit perbedaan: operasi mutasi biasanya tidak perlu menyimpan `status` di store — cukup kembalikan hasilnya ke komponen.

```ts
type ProductStore = {
  products: Product[];
  isMutating: boolean;  // ← loading khusus untuk create/update/delete
  mutationError: string | null;

  createProduct: (input: CreateInput) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
};

const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  isMutating: false,
  mutationError: null,

  createProduct: async (input) => {
    set({ isMutating: true, mutationError: null });
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Gagal membuat produk');
      const product: Product = await res.json();
      set((state) => ({
        products: [...state.products, product],
        isMutating: false,
      }));
      return product;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      set({ mutationError: message, isMutating: false });
      return null;
    }
  },
}));
```

---

## Bagian 7 — Race Condition: Masalah Fetch yang Sering Diabaikan

Race condition terjadi ketika dua request dikirim berurutan cepat, dan response dari request pertama tiba **setelah** response dari request kedua.

```
User pilih kategori "Elektronik" → request A dikirim
User langsung pilih kategori "Pakaian" → request B dikirim

Response B tiba lebih dulu → products diisi dengan produk Pakaian ✅
Response A tiba belakangan → products ditimpa dengan produk Elektronik ❌
```

User sedang melihat kategori "Pakaian" tapi yang tampil produk "Elektronik". Bug!

Solusi sederhana: gunakan flag untuk membatalkan request yang usang.

```ts
fetchProducts: async (category: string) => {
  // Batalkan request sebelumnya dengan AbortController
  const controller = new AbortController();
  
  set({ status: 'loading', error: null });

  try {
    const res = await fetch(`/api/products?category=${category}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    set({ products: data, status: 'success' });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return; // diabaikan
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    set({ status: 'error', error: message });
  }

  // Kembalikan controller agar bisa dibatalkan dari luar
  return controller;
},
```

Untuk penanganan yang lebih lengkap, pertimbangkan menggunakan **TanStack Query** yang menangani race condition, caching, dan refetch secara otomatis. Zustand paling cocok untuk **client state**, bukan server state.

---

## Ringkasan

| Konsep | Penjelasan |
|---|---|
| Async di Zustand | Tulis `async/await` langsung di action, tidak perlu middleware |
| `isLoading + error + data` | Pola dasar, tapi ada ambiguitas di beberapa kombinasi |
| Status enum | `'idle' \| 'loading' \| 'success' \| 'error'` — lebih presisi dan tidak ambigu |
| `isMutating` | Field terpisah untuk loading operasi create/update/delete |
| Race condition | Problem nyata di aplikasi — pertimbangkan `AbortController` atau TanStack Query |
