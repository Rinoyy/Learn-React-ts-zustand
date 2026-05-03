# Zustand — Panduan Belajar

> Materi disusun dari nol. Ikuti urutan ini kalau kamu baru mulai.

---

## Urutan Belajar

| # | File | Isi |
|---|---|---|
| 1 | [React State vs Zustand](./01-react-state-vs-zustand.md) | Kenapa Zustand diciptakan — mulai dari sini |
| 2 | [Fundamental Zustand](./02-fundamental.md) | Store, State, Action, store pertama |
| 3 | [Re-render — Cara React Memperbarui UI](./03-re-render.md) | Kapan React render ulang, dan cara Zustand mengontrolnya |
| 4 | [Fungsi `set` dan `get`](./04-set-dan-get.md) | Cara mengubah dan membaca state di dalam action |
| 5 | [Selector dan `useShallow`](./05-selector-dan-shallow.md) | Cara ambil state yang efisien |
| 6 | [Async Action dan Loading State](./06-async-dan-loading.md) | Fetch data, loading, error handling |
| 7 | [Middleware: `persist`](./07-persist.md) | Simpan state ke localStorage, survive refresh |
| 8 | [Middleware: `devtools`](./08-devtools.md) | Debug state di browser, time travel |
| 9 | [Middleware: `immer`](./09-immer.md) | Update state nested tanpa spread hell |
| 10 | [Subscribe — Akses Store di Luar React](./10-subscribe.md) | `getState`, `setState`, `subscribe` |
| 11 | [Arsitektur Store yang Scalable](./11-arsitektur.md) | Multi-store, slice pattern, folder structure |
| 12 | [Best Practices & Anti-Patterns](./12-best-practices.md) | Kesalahan umum dan cara menghindarinya |
| 13 | [Case Study: CRUD Products](./13-crud-case-study.md) | Praktek nyata — gabungan semua konsep |

---

## Referensi Cepat

| Mau ngapain | Baca |
|---|---|
| Bingung kapan pakai `useState` vs Zustand | [01](./01-react-state-vs-zustand.md) |
| Buat store pertama | [02](./02-fundamental.md) |
| Ngerti kenapa component re-render | [03](./03-re-render.md) |
| Paham cara kerja `set` | [04](./04-set-dan-get.md) |
| Baca state dari dalam action | [04](./04-set-dan-get.md) |
| Ambil beberapa field sekaligus dari store | [05](./05-selector-dan-shallow.md) |
| Fetch data + loading state | [06](./06-async-dan-loading.md) |
| State tidak hilang saat refresh | [07](./07-persist.md) |
| Debug state pakai browser extension | [08](./08-devtools.md) |
| Update array/object yang nested | [09](./09-immer.md) |
| Akses store di luar komponen React | [10](./10-subscribe.md) |
| Susun store untuk project besar | [11](./11-arsitektur.md) |
| Bingung kode udah benar tapi masih re-render | [05](./05-selector-dan-shallow.md) + [03](./03-re-render.md) |
