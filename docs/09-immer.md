# Middleware: `immer`

> Semakin dalam/nested struktur state kamu, semakin rumit cara mengubahnya. `immer` memungkinkan kamu menulis kode mutasi langsung yang terasa natural, sambil tetap mengikuti aturan immutability JavaScript.

---

## Bagian 1 — Aturan Dasar: State Tidak Boleh Dimutasi Langsung

Sebelum masuk ke immer, kamu perlu paham mengapa mutasi langsung bermasalah di React dan Zustand.

React dan Zustand mendeteksi perubahan state dengan membandingkan **referensi objek**: apakah ini objek yang sama atau objek baru?

```ts
const state = { count: 0, user: { name: 'Alice' } };

// Mutasi langsung — referensi state TIDAK berubah
state.count = 1;
state.user.name = 'Bob';
// React/Zustand: "state masih objek yang sama" → tidak ada re-render!
```

Inilah kenapa kamu harus selalu membuat **objek baru** ketika mengubah state:

```ts
// ✅ Objek baru — referensi berubah → Zustand tahu ada perubahan → re-render
set((state) => ({
  count: state.count + 1,         // field baru
  user: { ...state.user, name: 'Bob' }, // copy user + ubah name
}));
```

Ini disebut **immutability** — kamu tidak mengubah data yang ada, melainkan membuat salinan baru dengan nilai yang diperbarui.

---

## Bagian 2 — Masalah: State Nested Membuat Kode Meledak

Immutability mudah untuk state yang flat. Masalah muncul ketika state nested bertingkat-tingkat.

Bayangkan store user settings:

```ts
type State = {
  user: {
    profile: {
      name: string;
      address: {
        city: string;
        country: string;
      };
    };
    preferences: {
      theme: 'light' | 'dark';
      notifications: {
        email: boolean;
        push: boolean;
      };
    };
  };
};
```

Kamu ingin mengubah `user.preferences.notifications.push` dari `true` ke `false`.

Dengan immutability manual (spread operator):

```ts
set((state) => ({
  user: {
    ...state.user,
    preferences: {
      ...state.user.preferences,
      notifications: {
        ...state.user.preferences.notifications,
        push: false,   // ← satu perubahan kecil ini
      },
    },
  },
}));
```

Empat level spread hanya untuk mengubah satu boolean. Ini yang disebut **spread hell** — kode yang panjang, susah dibaca, dan mudah salah ketik.

---

## Bagian 3 — Immer: Solusi yang Elegan

**Immer** adalah library yang memungkinkan kamu menulis kode yang **terlihat** seperti mutasi langsung, tapi di balik layar tetap menghasilkan objek baru yang immutable.

Cara kerjanya: immer memberi kamu **"draft"** — salinan sementara dari state. Kamu bebas memodifikasi draft ini sesuka hati. Ketika selesai, immer membandingkan draft dengan state asli dan menghasilkan objek baru yang immutable dengan perubahan yang kamu buat.

```
State asli: { count: 0, user: { name: 'Alice' } }
                             ↓
                       Immer membuat draft
                             ↓
draft.count = 1          ← kamu modifikasi draft
draft.user.name = 'Bob'  ← bebas, ini hanya draft
                             ↓
               Immer buat objek baru berdasarkan perubahan
                             ↓
State baru: { count: 1, user: { name: 'Bob' } }  ← referensi baru ✅
```

---

## Bagian 4 — Cara Menggunakan `immer` di Zustand

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
//                   ↑ bukan dari package 'immer', tapi dari 'zustand/middleware/immer'

const useUserStore = create<UserState>()(
  immer((set) => ({
    user: {
      profile: {
        name: 'Alice',
        address: { city: 'Jakarta', country: 'ID' },
      },
      preferences: {
        theme: 'light',
        notifications: { email: true, push: true },
      },
    },

    // Dengan immer: tulis seperti mutasi langsung
    updateCity: (city: string) =>
      set((state) => {
        state.user.profile.address.city = city; // ← langsung!
      }),

    togglePushNotif: () =>
      set((state) => {
        state.user.preferences.notifications.push =
          !state.user.preferences.notifications.push;
      }),

    setTheme: (theme: 'light' | 'dark') =>
      set((state) => {
        state.user.preferences.theme = theme;
      }),
  }))
);
```

Bandingkan dengan versi tanpa immer — perbedaannya sangat drastis untuk state nested.

---

## Bagian 5 — Immer untuk Array: Operasi yang Lebih Natural

Immer sangat berguna untuk operasi array yang biasanya membutuhkan metode immutable:

**Tanpa immer:**

```ts
// Tambah item
addItem: (item) => set((state) => ({
  items: [...state.items, item],
})),

// Hapus item
removeItem: (id) => set((state) => ({
  items: state.items.filter((i) => i.id !== id),
})),

// Update item
updateItem: (id, changes) => set((state) => ({
  items: state.items.map((i) => i.id === id ? { ...i, ...changes } : i),
})),

// Pindah urutan (complex!)
moveItem: (fromIndex, toIndex) => set((state) => {
  const items = [...state.items];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return { items };
}),
```

**Dengan immer:**

```ts
// Tambah item
addItem: (item) => set((state) => {
  state.items.push(item);  // ← push langsung ✅
}),

// Hapus item
removeItem: (id) => set((state) => {
  const index = state.items.findIndex((i) => i.id === id);
  if (index !== -1) state.items.splice(index, 1);
}),

// Update item
updateItem: (id, changes) => set((state) => {
  const item = state.items.find((i) => i.id === id);
  if (item) Object.assign(item, changes);
}),

// Pindah urutan
moveItem: (fromIndex, toIndex) => set((state) => {
  const [moved] = state.items.splice(fromIndex, 1);
  state.items.splice(toIndex, 0, moved);
}),
```

---

## Bagian 6 — Perhatian: Jangan Return dan Mutasi Sekaligus

Ketika menggunakan immer, ada satu aturan penting: di dalam callback `set`, kamu boleh **mutasi** state atau **return** nilai baru, tapi tidak keduanya sekaligus.

```ts
// ✅ Hanya mutasi
set((state) => {
  state.count = 1;
  // tidak return apa-apa → immer tahu kamu pakai mutasi
});

// ✅ Hanya return
set((state) => ({
  count: 1,
  // return object baru → immer gunakan ini
}));

// ❌ JANGAN keduanya — immer tidak bisa memutuskan yang mana dipakai
set((state) => {
  state.count = 1;
  return { count: 2 }; // konflik!
});
```

---

## Bagian 7 — Immer dengan `devtools` dan `persist`

Ketika menggunakan banyak middleware, urutan yang disarankan:

```ts
create<State>()(
  devtools(
    persist(
      immer(
        (set, get) => ({ ... })
      ),
      { name: 'my-storage' }
    ),
    { name: 'MyStore' }
  )
)
```

Urutan dari luar ke dalam: `devtools` → `persist` → `immer` → store asli.

---

## Bagian 8 — Kapan Pakai Immer?

Immer paling berguna ketika:

| Situasi | Pakai immer? |
|---|---|
| State flat (2-3 field sederhana) | Tidak perlu — spread biasa cukup |
| State nested 2+ level | Ya — immer sangat membantu |
| Operasi array yang kompleks (sort, splice, reorder) | Ya |
| Banyak operasi update di satu action | Ya |
| Team yang tidak terbiasa dengan spread immutability | Ya |

> **Catatan:** immer menambahkan sedikit overhead karena proses membuat dan membandingkan draft. Untuk store sederhana, ini tidak terasa. Untuk store dengan state yang sangat besar dan update yang sangat sering, bisa diukur dengan profiler.
