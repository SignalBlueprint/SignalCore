/**
 * Catalog domain schemas
 */

/**
 * Product attributes (flexible key-value store)
 */
export type ProductAttributes = Record<string, string | number | boolean>;

/**
 * Product status
 */
export type ProductStatus = "draft" | "active" | "archived" | "out_of_stock";

/**
 * Image variant types
 */
export interface ProductImage {
  id: string;
  url: string;
  type: "original" | "generated" | "thumbnail";
  width?: number;
  height?: number;
  size?: number; // bytes
  uploadedAt: string;
}

/**
 * Vision analysis result from OpenAI
 */
export interface VisionAnalysis {
  detectedName?: string;
  description?: string;
  category?: string;
  colors?: string[];
  materials?: string[];
  condition?: string;
  suggestedPrice?: number;
  tags?: string[];
  confidence?: number;
  rawAnalysis?: string;
}

/**
 * Inventory tracking
 */
export interface InventoryData {
  stockLevel: number;
  lowStockThreshold?: number;
  sku?: string;
  barcode?: string;
  location?: string;
  lastRestocked?: string;
}

/**
 * Product entity
 */
export interface Product {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  attributes?: ProductAttributes;
  images: ProductImage[];
  status: ProductStatus;
  inventory?: InventoryData;
  visionAnalysis?: VisionAnalysis;
  embedding?: number[]; // Vector embedding for semantic search
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Lookbook entity
 */
export interface Lookbook {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  products: string[]; // Array of product IDs
  coverImage?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Store settings for an organization
 */
export interface StoreSettings {
  id: string;
  orgId: string;
  storeName?: string;
  storeUrl?: string;
  currency: string;
  isPublic: boolean;
  customDomain?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  updatedAt: string;
}

/**
 * Product image upload request
 */
export interface ProductImageUpload {
  filename: string;
  contentType: string;
  data: Buffer | string; // base64 or buffer
}

/**
 * Product creation from image request
 */
export interface CreateProductFromImageRequest {
  orgId: string;
  image: ProductImageUpload;
  generateCleanShot?: boolean;
  autoAnalyze?: boolean;
}

