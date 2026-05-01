import { useProductStore } from "./productStore";
import { useShallow } from "zustand/shallow";
import type { Product } from "../types";

export const useProducts = () => useProductStore((s) => s.products);
export const useProductError = () => useProductStore((s) => s.error);

export const useProductById = (id: string): Product | undefined =>
  useProductStore((s) => s.products.find((p) => p.id == id));
export const useProductCount = () => useProductStore((s) => s.products.length);

export const useTotalStock = () =>
  useProductStore((s) => s.products.reduce((sum, p) => sum + p.stock, 0));

export const useTotalValue = () =>
  useProductStore((s) =>
    s.products.reduce((sum, p) => sum + p.price * p.stock, 0),
  );
export const useProductActions = () =>
  useProductStore(
    useShallow((s) => ({
      createProduct: s.createProduct,
      updateProduct: s.updateProduct,
      deleteProduct: s.deleteProduct,
      clearError: s.clearError,
    })),
  );
