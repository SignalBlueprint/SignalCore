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

/**
 * Shopping Cart
 */
export interface CartItem {
  productId: string;
  productName: string; // Snapshot at time of adding
  price: number; // Price snapshot
  currency: string;
  quantity: number;
  imageUrl?: string; // First product image
  addedAt: string;
}

export interface Cart {
  id: string;
  sessionId: string; // Can be userId for logged-in users or session ID for guests
  orgId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // Carts expire after 30 days
}

/**
 * Orders & Checkout
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "processing" | "canceled";

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface OrderItem {
  productId: string;
  productName: string; // Snapshot
  productDescription?: string; // Snapshot
  price: number; // Price snapshot
  quantity: number;
  subtotal: number; // price * quantity
  imageUrl?: string;
  sku?: string;
}

export interface OrderPricing {
  subtotal: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
  currency: string;
}

export interface Order {
  id: string;
  orderNumber: string; // Human-readable, e.g., "ORD-20231215-001"
  orgId: string;
  sessionId: string; // userId or guest session
  items: OrderItem[];
  customer: CustomerInfo;
  pricing: OrderPricing;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string; // "stripe", "paypal", "cash_on_delivery", etc.
  transactionId?: string;
  stripePaymentIntentId?: string; // Stripe payment intent ID
  trackingNumber?: string;
  notes?: string;
  internalNotes?: string; // Admin-only notes
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  paidAt?: string; // When payment was completed
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

