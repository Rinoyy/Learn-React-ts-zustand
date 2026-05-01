import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import type { CreateProductInput, Product, UpdateProductInput } from "../types";
import { generateId } from "../utils";

type ProductState = {
  products: Product[];
  error: string | null;

  createProduct: (input: CreateProductInput) => Product | null;
  updateProduct: (input: UpdateProductInput) => Product | null;
  deleteProduct: (id: string) => boolean;

  clearError: () => void;
  resetAll: () => void;
};

const validateProduct = (input: CreateProductInput): string | null => {
  if (!input.name.trim()) return "Nama product tidak boleh kosong";
  if (input.name.length > 100) return "Nama maksimal 100 karakter";
  if (input.price < 0) return "Harga tidak boleh negatif";
  if (input.stock < 0) return "Stok tidak boleh negatif";
  if (!Number.isInteger(input.stock)) return "Stok harus bilangan bulat";
  return null;
};

export const useProductStore = create<ProductState>()(
  devtools(
    persist(
      (set, get) => ({
        products: [],
        error: null,

        createProduct: (input) => {
          const validationError = validateProduct(input);

          if (validationError) {
            set({ error: validationError }, false, "products/create/error");
            return null;
          }

          const now = new Date().toISOString();
          const product: Product = {
            id: generateId(),
            ...input,
            createdAt: now,
            updatedAt: now,
          };

          set(
            (state) => ({
              products: [...state.products, product],
              error: null,
            }),
            false,
            "products/create/success",
          );
          return product;
        },

        updateProduct: ({ id, ...input }) => {
          const existing = get().products.find((p) => p.id === id);
          if (!existing) {
            set(
              { error: "Product tidak ditemukan" },
              false,
              "products/update/notfound",
            );
            return null;
          }
          const merged = { ...existing, ...input };

          const validationError = validateProduct({
            name: merged.name,
            price: merged.price,
            stock: merged.stock,
          });

          if (validationError) {
            set({ error: validationError }, false, "products/update/error");
            return null;
          }

          const updated: Product = {
            ...merged,
            updatedAt: new Date().toISOString(),
          };

          set(
            (state) => ({
              products: state.products.map((p) => (p.id === id ? updated : p)),
              error: null,
            }),
            false,
            "products/update/success",
          );
          return updated;
        },

        deleteProduct: (id) => {
          const exists = get().products.some((p) => p.id === id);
          if (!exists) {
            set(
              { error: "Product tidak ditemukan" },
              false,
              "products/delete/notfound",
            );
            return false;
          }

          set(
            (state) => ({
              products: state.products.filter((p) => p.id !== id),
              error: null,
            }),
            false,
            "products/delete/success",
          );
          return true;
        },
        clearError: () => set({ error: null }, false, "products/clearError"),

        resetAll: () =>
          set({ products: [], error: null }, false, "products/resetAll"),
      }),
      {
        name: "product-storage",
        storage: createJSONStorage(() => localStorage),
        version: 1,
        partialize: (state) => ({ products: state.products }),
      },
    ),
    { name: "ProductStore" },
  ),
);
