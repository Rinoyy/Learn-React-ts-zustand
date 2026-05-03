# Re-render — Cara React Memperbarui UI

> Memahami re-render adalah kunci untuk menulis kode Zustand yang benar. Banyak bug performa berakar dari tidak pahamnya mekanisme ini.

---

## Bagian 1 — Apa Itu Re-render?

Ketika React perlu memperbarui tampilan di layar, ia menjalankan ulang fungsi komponen kamu dari atas ke bawah. Proses ini disebut **re-render**.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  console.log('Counter dijalankan'); // ← ini berjalan setiap re-render

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

Setiap kali tombol diklik, `setCount` dipanggil, dan React menjalankan ulang fungsi `Counter` dari awal. `console.log` di atas akan tercetak setiap kali itu terjadi.

Re-render itu **normal dan diperlukan** — itulah cara React memperbarui UI. Yang menjadi masalah adalah **re-render yang tidak perlu**: ketika komponen dijalankan ulang padahal outputnya tidak akan berubah sama sekali.

---

## Bagian 2 — Apa yang Memicu Re-render?

Ada empat pemicu utama re-render di React:

**1. State berubah (`useState` / `useReducer`)**

```tsx
const [count, setCount] = useState(0);
setCount(1); // ← memicu re-render
```

**2. Props berubah**

```tsx
// Parent re-render dan mengirim props baru → child re-render
function Parent() {
  const [name, setName] = useState('Alice');
  return <Child name={name} />; // kalau name berubah, Child re-render
}
```

**3. Parent re-render**

Ini yang sering mengejutkan pemula: kalau parent re-render, **semua child-nya ikut re-render** secara default, walaupun props yang dikirim ke child tidak berubah.

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Klik</button>
      <Child />  {/* ← ikut re-render setiap klik, walau tidak ada props */}
    </>
  );
}
```

**4. Context berubah**

Seperti yang dibahas di [01-react-state-vs-zustand.md](./01-react-state-vs-zustand.md) — semua konsumen Context re-render ketika nilai context berubah.

---

## Bagian 3 — Masalah: Re-render yang Tidak Perlu

Bayangkan sebuah toko online dengan state yang dikelola lewat Context:

```tsx
const AppContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [notifications, setNotifications] = useState([]);

  return (
    <AppContext.Provider value={{ user, cart, notifications }}>
      <Header />      {/* pakai: user */}
      <CartSidebar /> {/* pakai: cart */}
      <NotifBell />   {/* pakai: notifications */}
      <ProductGrid /> {/* tidak pakai state apapun dari context */}
    </AppContext.Provider>
  );
}
```

Ketika ada notifikasi baru masuk (hanya `notifications` berubah):
- `NotifBell` re-render ✅
- `Header` re-render ❌ (hanya butuh `user`, tidak berubah)
- `CartSidebar` re-render ❌ (hanya butuh `cart`, tidak berubah)
- `ProductGrid` re-render ❌ (tidak butuh apapun dari context)

Di aplikasi nyata, `ProductGrid` bisa berisi ratusan `ProductCard`. Semua ikut re-render hanya karena notifikasi masuk. Performa turun drastis.

---

## Bagian 4 — Cara Zustand Mengontrol Re-render

Zustand tidak menggunakan Context untuk menyebarkan state. Ia menggunakan **subscription system**.

Cara kerjanya:

1. Ketika kamu memanggil `useCounterStore((state) => state.count)`, komponen kamu "mendaftar" sebagai pendengar untuk field `count`.
2. Ketika `count` berubah, Zustand menjalankan **selector** kamu dan membandingkan hasilnya dengan hasil sebelumnya.
3. Kalau hasilnya **sama** → komponen tidak di-render ulang.
4. Kalau hasilnya **berbeda** → komponen di-render ulang.

```
store.count berubah dari 0 ke 1
      ↓
Zustand jalankan selector komponen A: (state) => state.count
Hasil lama: 0, Hasil baru: 1 → BERBEDA → komponen A re-render ✅

Zustand jalankan selector komponen B: (state) => state.username  
Hasil lama: "Alice", Hasil baru: "Alice" → SAMA → tidak re-render ✅
```

---

## Bagian 5 — Object.is: Cara Zustand Membandingkan Nilai

Zustand menggunakan fungsi bawaan JavaScript bernama `Object.is` untuk membandingkan hasil selector.

`Object.is(a, b)` mengembalikan `true` jika `a` dan `b` adalah **nilai yang sama persis**.

Untuk tipe data primitif (angka, string, boolean), ini bekerja intuitif:

```ts
Object.is(0, 0)        // → true (sama)
Object.is(1, 1)        // → true (sama)
Object.is(0, 1)        // → false (berbeda) → re-render
Object.is('Alice', 'Alice') // → true (sama)
Object.is(true, false) // → false (berbeda) → re-render
```

Untuk object dan array, ini bekerja berdasarkan **referensi memori**, bukan isi:

```ts
const a = { name: 'Alice' };
const b = { name: 'Alice' };
Object.is(a, b) // → false! Walaupun isinya sama, ini dua object berbeda di memori

const c = a;
Object.is(a, c) // → true. c dan a merujuk ke object yang sama di memori
```

Ini adalah **sumber bug yang paling umum** saat pakai Zustand.

---

## Bagian 6 — Konsekuensi Praktis dari Object.is

### Masalah: Selector yang Return Object Baru

```tsx
// ❌ SALAH — selector ini membuat object baru setiap kali dijalankan
const userInfo = useUserStore((state) => ({
  name: state.name,
  email: state.email,
}));
```

Walaupun `name` dan `email` tidak berubah, `{ name: ..., email: ... }` adalah object **baru** setiap kali selector dijalankan. `Object.is` membandingkan referensi, bukan isi. Hasilnya selalu berbeda → komponen selalu re-render.

Solusi: gunakan `useShallow`. Dibahas lengkap di [05-selector-dan-shallow.md](./05-selector-dan-shallow.md).

### Masalah: Selector yang Return Array Baru

```tsx
// ❌ SALAH — filter() selalu menghasilkan array baru
const activeItems = useCartStore((state) =>
  state.items.filter((item) => item.active)
);
```

Setiap kali store berubah (bahkan karena field lain), selector ini dijalankan, menghasilkan array baru, dan komponen re-render — walaupun item aktifnya tidak berubah.

Untuk kasus ini, kamu perlu `useShallow` atau memoization tambahan. Dibahas di [05-selector-dan-shallow.md](./05-selector-dan-shallow.md).

### Yang Benar: Selector yang Return Primitif

```tsx
// ✅ BENAR — angka dan string dibandingkan berdasarkan nilai
const count = useCounterStore((state) => state.count);
const username = useUserStore((state) => state.user.name);
const isLoading = useProductStore((state) => state.isLoading);
```

Kalau `count` masih `5`, `Object.is(5, 5) === true` → tidak re-render. Efisien.

---

## Bagian 7 — Ringkasan

| Konsep | Penjelasan |
|---|---|
| Re-render | React menjalankan ulang fungsi komponen untuk memperbarui UI |
| Pemicu | State berubah, props berubah, parent re-render, context berubah |
| Masalah | Re-render yang tidak perlu menghabiskan resource |
| Cara Zustand | Setiap komponen subscribe ke field spesifik, bukan ke seluruh store |
| Mekanisme | Zustand bandingkan hasil selector dengan `Object.is` sebelum re-render |
| Implikasi | Selector yang return object/array baru selalu memicu re-render — gunakan `useShallow` |

> **Aturan emas:** buat selector se-spesifik mungkin dan kembalikan tipe primitif (angka, string, boolean) kalau memungkinkan. Kalau perlu return object/array, gunakan `useShallow`.
