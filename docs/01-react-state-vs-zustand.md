# React State vs Zustand — Dari Mana Masalah Muncul

> Sebelum belajar Zustand, kamu perlu tahu kenapa ia diciptakan. Semua berawal dari cara React mengelola state secara bawaan.

---

## Bagian 1 — State Lokal: `useState`

React punya cara bawaan untuk menyimpan data di sebuah komponen: `useState`.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Klik: {count}
    </button>
  );
}
```

`count` hidup **di dalam** komponen `Counter`. Hanya komponen itu yang bisa membacanya dan mengubahnya.

Ini bekerja sempurna selama data hanya dibutuhkan di satu tempat.

**Masalah muncul ketika dua komponen berbeda perlu berbagi data yang sama.**

---

## Bagian 2 — Masalah: Data Perlu Dibagi ke Banyak Tempat

Bayangkan kamu punya dua komponen:
- `CartIcon` — menampilkan angka jumlah item di keranjang (misal: `(3)`)
- `CartDrawer` — menampilkan daftar item di keranjang

Keduanya butuh data yang sama: isi keranjang belanja.

Kalau data itu hidup di dalam `CartIcon`, `CartDrawer` tidak bisa mengaksesnya.
Kalau data itu hidup di dalam `CartDrawer`, `CartIcon` tidak bisa mengaksesnya.

Data tidak bisa hidup di dua tempat sekaligus.

---

## Bagian 3 — Solusi Pertama: "Lift State Up"

React punya pola untuk ini: naikkan state ke komponen **induk bersama** (common parent). Karena `App` adalah induk dari `CartIcon` dan `CartDrawer`, data disimpan di `App` lalu dikirim ke bawah lewat props.

```tsx
function App() {
  const [cartItems, setCartItems] = useState([]);

  return (
    <>
      <CartIcon count={cartItems.length} />
      <CartDrawer
        items={cartItems}
        onAdd={(item) => setCartItems([...cartItems, item])}
      />
    </>
  );
}
```

Ini bekerja. Tapi ada konsekuensi yang terasa menyakitkan seiring aplikasi berkembang.

---

## Bagian 4 — Props Drilling: Ketika "Lift State Up" Tidak Cukup

Dunia nyata tidak sesederhana contoh di atas. Komponen sering bertingkat-tingkat dalam.

Bayangkan struktur seperti ini:

```
App
└── Layout
    └── Header
        └── Navigation
            └── CartIcon   ← yang butuh data cart
```

Dengan pola lift state up, data cart ada di `App`. Untuk sampai ke `CartIcon`, data itu harus dioper dari komponen ke komponen melewati semua lapisan:

```tsx
function App() {
  const [cartItems] = useState([]);
  return <Layout cartItems={cartItems} />;      // 1. oper ke Layout
}

function Layout({ cartItems }) {
  return <Header cartItems={cartItems} />;      // 2. oper ke Header
}

function Header({ cartItems }) {
  return <Navigation cartItems={cartItems} />; // 3. oper ke Navigation
}

function Navigation({ cartItems }) {
  return <CartIcon count={cartItems.length} />; // 4. akhirnya sampai
}
```

`Layout`, `Header`, dan `Navigation` tidak butuh `cartItems` sama sekali. Mereka cuma jadi "kurir" yang mengirim data yang bukan urusan mereka.

Inilah yang disebut **props drilling**: mengebor props melewati banyak lapisan komponen yang tidak berkepentingan.

**Masalah props drilling:**
- Kode jadi verbose dan berantakan
- Kalau struktur komponen berubah, semua rantai props harus diupdate
- Komponen di tengah jadi "kotor" dengan props yang tidak mereka gunakan

---

## Bagian 5 — Context API: Solusi Bawaan React

React menyediakan **Context API** untuk mengatasi props drilling. Idenya: buat "jalur langsung" antara penyedia data dan konsumen, melewati semua komponen di tengah.

```tsx
// 1. Buat konteks
const CartContext = createContext(null);

// 2. Bungkus tree dengan Provider — data disimpan di sini
function App() {
  const [cartItems, setCartItems] = useState([]);

  return (
    <CartContext.Provider value={{ cartItems, setCartItems }}>
      <Layout />   {/* tidak perlu oper props cart lagi */}
    </CartContext.Provider>
  );
}

// 3. Komponen konsumen ambil langsung dari konteks
function CartIcon() {
  const { cartItems } = useContext(CartContext); // langsung! tanpa props drilling
  return <span>({cartItems.length})</span>;
}
```

`Layout`, `Header`, `Navigation` tidak tahu apa-apa tentang cart. `CartIcon` ambil langsung dari konteks.

Ini jauh lebih bersih. Tapi Context API punya masalah serius yang tidak terlihat di awal.

---

## Bagian 6 — Masalah Context API: Re-render Berantai

Ketika nilai di dalam `Provider` berubah, **semua komponen yang pakai `useContext` tersebut akan re-render**, walaupun data spesifik yang mereka butuhkan tidak berubah.

Bayangkan satu konteks berisi banyak data:

```tsx
const AppContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [theme, setTheme] = useState('light');

  return (
    <AppContext.Provider value={{ user, cart, theme, setUser, setCart, setTheme }}>
      <Layout />
    </AppContext.Provider>
  );
}
```

Dan tiga komponen yang masing-masing butuh data berbeda:

```tsx
function UserProfile() {
  const { user } = useContext(AppContext);   // hanya butuh: user
  return <p>Halo, {user?.name}</p>;
}

function CartIcon() {
  const { cart } = useContext(AppContext);   // hanya butuh: cart
  return <span>({cart.length})</span>;
}

function ThemeToggle() {
  const { theme } = useContext(AppContext);  // hanya butuh: theme
  return <button>Mode: {theme}</button>;
}
```

Sekarang user menambah item ke keranjang (hanya `cart` yang berubah):

```
cart berubah
     ↓
AppContext.Provider mendapat nilai baru
     ↓
React: "context berubah, beritahu semua konsumen"
     ↓
UserProfile  re-render ❌  (tidak perlu! user tidak berubah)
CartIcon     re-render ✅  (wajar)
ThemeToggle  re-render ❌  (tidak perlu! theme tidak berubah)
```

React tidak bisa membedakan. Yang dia tahu: nilai context berubah → semua konsumer ikut re-render.

Di aplikasi kecil ini tidak terasa. Di aplikasi besar dengan puluhan komponen yang consume konteks yang sama dan state yang sering berubah, ini bisa menyebabkan ratusan re-render tidak perlu setiap detik — dan UI jadi lambat.

---

## Bagian 7 — Zustand: Subscription yang Spesifik

Zustand menyelesaikan ini dengan cara yang berbeda secara fundamental.

Alih-alih "context berubah → semua re-render", Zustand menggunakan **sistem subscription per field**: setiap komponen mendaftar untuk mendengarkan perubahan pada bagian **spesifik** dari state. Kalau bagian itu berubah, komponen itu re-render. Kalau tidak berubah, komponen itu tidak diganggu sama sekali.

```tsx
// Store Zustand — satu tempat untuk semua state
const useAppStore = create((set) => ({
  user: null,
  cart: [],
  theme: 'light',
}));

// Setiap komponen subscribe ke field yang mereka butuhkan
function UserProfile() {
  const user = useAppStore((state) => state.user);  // subscribe ke "user" saja
  return <p>Halo, {user?.name}</p>;
}

function CartIcon() {
  const cart = useAppStore((state) => state.cart);  // subscribe ke "cart" saja
  return <span>({cart.length})</span>;
}

function ThemeToggle() {
  const theme = useAppStore((state) => state.theme); // subscribe ke "theme" saja
  return <button>Mode: {theme}</button>;
}
```

Sekarang kalau `cart` berubah:

```
cart berubah
     ↓
Zustand: "siapa yang subscribe ke cart?"
     ↓
Hanya CartIcon  → CartIcon re-render ✅
UserProfile    → tidak re-render ✅ (subscribe ke user, bukan cart)
ThemeToggle    → tidak re-render ✅ (subscribe ke theme, bukan cart)
```

Ini yang disebut **fine-grained subscription** — berlangganan secara presisi.

---

## Bagian 8 — Ringkasan: Kapan Pakai Apa

| Situasi | Solusi Tepat |
|---|---|
| State hanya dibutuhkan 1 komponen | `useState` |
| State dibutuhkan 2–3 komponen yang dekat | Lift state up + props |
| State dibutuhkan banyak tempat, **jarang berubah** (misal: locale, tema) | Context API |
| State dibutuhkan banyak tempat, **sering berubah** (cart, user, produk) | **Zustand** |
| Data dari server yang butuh cache + refetch | TanStack Query / SWR |

Zustand bukan pengganti `useState`. Di satu aplikasi, keduanya dipakai bersama.

> **Aturan praktis:** kalau satu state perlu dibaca atau diubah dari lebih dari 2–3 tempat yang tidak langsung berhubungan, itu sinyal kuat untuk dipindah ke Zustand.
