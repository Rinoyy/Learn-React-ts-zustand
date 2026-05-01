export type Product = {
    id: string;
    name: string;
    price: number;
    stock: number;
    createdAt: string;
    updatedAt: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProductInput = Partial<CreateProductInput> & { id: string }