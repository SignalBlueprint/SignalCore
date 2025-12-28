/**
 * Catalog domain schemas
 */

/**
 * Product attributes (flexible key-value store)
 */
export type ProductAttributes = Record<string, string | number | boolean>;

/**
 * Product entity
 */
export interface Product {
  id: string;
  orgId: string;
  name: string;
  price?: number;
  attributes?: ProductAttributes;
  images?: string[];
  createdAt: string;
}

/**
 * Lookbook entity
 */
export interface Lookbook {
  id: string;
  orgId: string;
  title: string;
  products: string[]; // Array of product IDs
  createdAt: string;
}

