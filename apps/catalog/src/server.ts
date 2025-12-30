/**
 * Catalog Server
 * Product catalog and inventory management with AI-powered features
 */

import "@sb/config";
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { join } from "path";
import { getSuiteApp } from "@sb/suite";
import { storage } from "@sb/storage";
import { uploadFile, deleteFile } from "@sb/storage";
import {
  analyzeProductImage,
  generateProductEmbedding,
  createProductSearchText,
  generateProductShot,
  generateProductDescription,
} from "@sb/ai";
import type {
  Product,
  ProductImage,
  Lookbook,
  StoreSettings,
  VisionAnalysis,
  ProductStatus,
} from "@sb/schemas";

const suiteApp = getSuiteApp("catalog");
const port = Number(process.env.PORT ?? suiteApp.defaultPort);

const app = express();

// Serve static files from public directory
app.use(express.static(join(__dirname, "../public")));

// Serve uploaded files from local storage (if using local storage mode)
// This makes local files accessible for OpenAI Vision API
const uploadsDir = join(process.cwd(), ".sb", "uploads");
if (require("fs").existsSync(uploadsDir)) {
  app.use("/uploads", express.static(uploadsDir));
}

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (body) {
    const duration = Date.now() - startTime;
    const status = res.statusCode || 200;
    console.log(`${req.method} ${req.path} ${status} ${duration}ms`);
    return originalSend.call(this, body);
  };

  res.json = function (body) {
    const duration = Date.now() - startTime;
    const status = res.statusCode || 200;
    console.log(`${req.method} ${req.path} ${status} ${duration}ms`);
    return originalJson.call(this, body);
  };

  next();
});

// ============================================================================
// Health & Status
// ============================================================================

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", app: suiteApp.id });
});

app.get("/api/status", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const products = await storage.list<Product>("products", (p) => p.orgId === orgId);

    res.json({
      ok: true,
      app: suiteApp.name,
      productCount: products.length,
      orgId,
    });
  } catch (error) {
    console.error("Status endpoint error:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// Product Endpoints
// ============================================================================

// Get all products for an org
app.get("/api/products", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const status = req.query.status as ProductStatus | undefined;
    const category = req.query.category as string | undefined;

    let products = await storage.list<Product>("products", (p) => p.orgId === orgId);

    // Apply filters
    if (status) {
      products = products.filter((p) => p.status === status);
    }
    if (category) {
      products = products.filter((p) => p.category === category);
    }

    // Sort by creation date (newest first)
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await storage.get<Product>("products", req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Create product manually
app.post("/api/products", async (req, res) => {
  try {
    const {
      orgId = "default-org",
      name,
      description,
      price,
      currency = "USD",
      category,
      status = "draft",
      tags,
      inventory,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const product: Product = {
      id: randomUUID(),
      orgId,
      name,
      description,
      price,
      currency,
      category,
      status,
      tags,
      inventory,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert("products", product);
    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update product
app.put("/api/products/:id", async (req, res) => {
  try {
    const existing = await storage.get<Product>("products", req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updated: Product = {
      ...existing,
      ...req.body,
      id: req.params.id,
      orgId: existing.orgId,
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert("products", updated);
    res.json(updated);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await storage.get<Product>("products", req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete associated images
    for (const img of product.images) {
      try {
        await deleteFile(img.id, "product-images");
      } catch (err) {
        console.warn(`Failed to delete image ${img.id}:`, err);
      }
    }

    await storage.remove("products", req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Image Upload & Analysis Endpoints
// ============================================================================

// Upload product image and analyze
app.post("/api/products/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const orgId = req.body.orgId || "default-org";
    const autoAnalyze = req.body.autoAnalyze !== "false";
    const generateClean = req.body.generateClean === "true";

    // Upload original image
    // Use full server URL for local storage so OpenAI Vision can access it
    const serverUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
    const uploadedFile = await uploadFile({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      data: req.file.buffer,
      bucket: "product-images",
      folder: orgId,
      publicBaseUrl: `${serverUrl}/uploads`, // Pass server URL for local storage fallback
    });

    const productImage: ProductImage = {
      id: uploadedFile.id,
      url: uploadedFile.url,
      type: "original",
      size: uploadedFile.size,
      uploadedAt: uploadedFile.uploadedAt,
    };

    let visionAnalysis: VisionAnalysis | undefined;

    // Analyze image with OpenAI Vision
    if (autoAnalyze) {
      try {
        visionAnalysis = await analyzeProductImage({
          imageUrl: uploadedFile.url,
          detailLevel: "high",
        });
      } catch (error) {
        console.warn("Vision analysis failed:", error);
      }
    }

    // Create product from analysis
    const product: Product = {
      id: randomUUID(),
      orgId,
      name: visionAnalysis?.detectedName || "Untitled Product",
      description: visionAnalysis?.description,
      category: visionAnalysis?.category,
      price: visionAnalysis?.suggestedPrice,
      currency: "USD",
      tags: visionAnalysis?.tags,
      status: "draft",
      images: [productImage],
      visionAnalysis,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate embedding for search
    const searchText = createProductSearchText(product);
    product.embedding = await generateProductEmbedding(searchText);

    // Save product
    await storage.upsert("products", product);

    // Optionally generate clean product shot
    if (generateClean && visionAnalysis) {
      try {
        const generated = await generateProductShot(
          product.name,
          visionAnalysis.description || ""
        );

        // In a real implementation, you'd download and upload the generated image
        // For now, we'll just store the URL
        const generatedImage: ProductImage = {
          id: randomUUID(),
          url: generated.url,
          type: "generated",
          uploadedAt: new Date().toISOString(),
        };

        product.images.push(generatedImage);
        await storage.upsert("products", product);
      } catch (error) {
        console.warn("Image generation failed:", error);
      }
    }

    res.status(201).json(product);
  } catch (error) {
    console.error("Upload product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Batch upload multiple product images
app.post("/api/products/upload/batch", upload.array("images", 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    const orgId = req.body.orgId || "default-org";
    const autoAnalyze = req.body.autoAnalyze !== "false";
    const generateClean = req.body.generateClean === "true";

    const serverUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
    const createdProducts: Product[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    // Process each image
    for (const file of files) {
      try {
        // Upload original image
        const uploadedFile = await uploadFile({
          filename: file.originalname,
          contentType: file.mimetype,
          data: file.buffer,
          bucket: "product-images",
          folder: orgId,
          publicBaseUrl: `${serverUrl}/uploads`,
        });

        const productImage: ProductImage = {
          id: uploadedFile.id,
          url: uploadedFile.url,
          type: "original",
          size: uploadedFile.size,
          uploadedAt: uploadedFile.uploadedAt,
        };

        let visionAnalysis: VisionAnalysis | undefined;

        // Analyze image with OpenAI Vision
        if (autoAnalyze) {
          try {
            visionAnalysis = await analyzeProductImage({
              imageUrl: uploadedFile.url,
              detailLevel: "high",
            });
          } catch (error) {
            console.warn(`Vision analysis failed for ${file.originalname}:`, error);
          }
        }

        // Create product from analysis
        const product: Product = {
          id: randomUUID(),
          orgId,
          name: visionAnalysis?.detectedName || file.originalname.replace(/\.[^/.]+$/, ""),
          description: visionAnalysis?.description,
          category: visionAnalysis?.category,
          price: visionAnalysis?.suggestedPrice,
          currency: "USD",
          tags: visionAnalysis?.tags,
          status: "draft",
          images: [productImage],
          visionAnalysis,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Generate embedding for search
        const searchText = createProductSearchText(product);
        product.embedding = await generateProductEmbedding(searchText);

        // Save product
        await storage.upsert("products", product);

        // Optionally generate clean product shot
        if (generateClean && visionAnalysis) {
          try {
            const generated = await generateProductShot(
              product.name,
              visionAnalysis.description || ""
            );

            const generatedImage: ProductImage = {
              id: randomUUID(),
              url: generated.url,
              type: "generated",
              uploadedAt: new Date().toISOString(),
            };

            product.images.push(generatedImage);
            await storage.upsert("products", product);
          } catch (error) {
            console.warn(`Image generation failed for ${file.originalname}:`, error);
          }
        }

        createdProducts.push(product);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.status(201).json({
      success: createdProducts.length > 0,
      created: createdProducts.length,
      failed: errors.length,
      products: createdProducts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Batch upload error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Analyze existing product image
app.post("/api/products/:id/analyze", async (req, res) => {
  try {
    const product = await storage.get<Product>("products", req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.images.length === 0) {
      return res.status(400).json({ error: "Product has no images to analyze" });
    }

    const primaryImage = product.images[0];
    const visionAnalysis = await analyzeProductImage({
      imageUrl: primaryImage.url,
      detailLevel: "high",
    });

    // Update product with analysis
    product.visionAnalysis = visionAnalysis;
    if (!product.description && visionAnalysis.description) {
      product.description = visionAnalysis.description;
    }
    if (!product.category && visionAnalysis.category) {
      product.category = visionAnalysis.category;
    }
    if (!product.tags && visionAnalysis.tags) {
      product.tags = visionAnalysis.tags;
    }

    // Update embedding
    const searchText = createProductSearchText(product);
    product.embedding = await generateProductEmbedding(searchText);

    product.updatedAt = new Date().toISOString();
    await storage.upsert("products", product);

    res.json({ visionAnalysis, product });
  } catch (error) {
    console.error("Analyze product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Generate clean product shot
app.post("/api/products/:id/generate-image", async (req, res) => {
  try {
    const product = await storage.get<Product>("products", req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const description = product.description || product.visionAnalysis?.description || "";
    if (!description) {
      return res.status(400).json({ error: "Product needs a description to generate image" });
    }

    const generated = await generateProductShot(product.name, description);

    // Store generated image URL (in production, download and upload to storage)
    const generatedImage: ProductImage = {
      id: randomUUID(),
      url: generated.url,
      type: "generated",
      uploadedAt: new Date().toISOString(),
    };

    product.images.push(generatedImage);
    product.updatedAt = new Date().toISOString();
    await storage.upsert("products", product);

    res.json({ image: generatedImage, product });
  } catch (error) {
    console.error("Generate image error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Search Endpoints
// ============================================================================

// Search products by text (using embeddings)
app.post("/api/products/search", async (req, res) => {
  try {
    const { query, orgId = "default-org", limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Generate embedding for search query
    const queryEmbedding = await generateProductEmbedding(query);

    // Get all products for org
    const allProducts = await storage.list<Product>("products", (p) => p.orgId === orgId);

    // Calculate cosine similarity and sort
    const results = allProducts
      .filter((p) => p.embedding && p.embedding.length > 0)
      .map((p) => ({
        product: p,
        similarity: cosineSimilarity(queryEmbedding, p.embedding!),
      }))
      .filter((r) => r.similarity > 0.5) // Threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json({
      query,
      results: results.map((r) => ({
        ...r.product,
        _similarity: r.similarity,
      })),
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Inventory Endpoints
// ============================================================================

// Update inventory
app.put("/api/products/:id/inventory", async (req, res) => {
  try {
    const product = await storage.get<Product>("products", req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.inventory = {
      ...product.inventory,
      ...req.body,
    };

    // Auto-update status based on stock level
    if (product.inventory.stockLevel <= 0) {
      product.status = "out_of_stock";
    } else if (product.status === "out_of_stock") {
      product.status = "active";
    }

    product.updatedAt = new Date().toISOString();
    await storage.upsert("products", product);

    res.json(product);
  } catch (error) {
    console.error("Update inventory error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// CSV Import/Export Endpoints
// ============================================================================

// Export products to CSV
app.get("/api/products/export/csv", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const products = await storage.list<Product>("products", (p) => p.orgId === orgId);

    // Create CSV headers
    const headers = [
      "id",
      "name",
      "description",
      "category",
      "price",
      "currency",
      "status",
      "tags",
      "sku",
      "stockLevel",
      "lowStockThreshold",
      "location",
      "createdAt",
      "updatedAt",
    ];

    // Convert products to CSV rows
    const rows = products.map((p) => [
      p.id,
      escapeCSV(p.name),
      escapeCSV(p.description || ""),
      escapeCSV(p.category || ""),
      p.price || "",
      p.currency || "USD",
      p.status,
      escapeCSV(p.tags?.join(";") || ""),
      escapeCSV(p.inventory?.sku || ""),
      p.inventory?.stockLevel ?? "",
      p.inventory?.lowStockThreshold ?? "",
      escapeCSV(p.inventory?.location || ""),
      p.createdAt,
      p.updatedAt,
    ]);

    // Combine headers and rows
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="products-${orgId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Import products from CSV
app.post("/api/products/import/csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No CSV file provided" });
    }

    const orgId = req.body.orgId || "default-org";
    const csvContent = req.file.buffer.toString("utf-8");
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({ error: "CSV file is empty or invalid" });
    }

    const headers = parseCSVLine(lines[0]);
    const imported: Product[] = [];
    const errors: Array<{ line: number; error: string }> = [];

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};

        // Map values to headers
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Create or update product
        const productId = row.id || randomUUID();
        const existing = row.id ? await storage.get<Product>("products", row.id) : null;

        const product: Product = {
          id: productId,
          orgId,
          name: row.name || "Untitled Product",
          description: row.description || undefined,
          category: row.category || undefined,
          price: row.price ? parseFloat(row.price) : undefined,
          currency: row.currency || "USD",
          status: (row.status as ProductStatus) || "draft",
          tags: row.tags ? row.tags.split(";").filter(Boolean) : undefined,
          inventory: {
            sku: row.sku || undefined,
            stockLevel: row.stockLevel ? parseInt(row.stockLevel) : undefined,
            lowStockThreshold: row.lowStockThreshold ? parseInt(row.lowStockThreshold) : undefined,
            location: row.location || undefined,
          },
          images: existing?.images || [],
          visionAnalysis: existing?.visionAnalysis,
          embedding: existing?.embedding,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Generate embedding if product has enough data and no existing embedding
        if (!product.embedding && (product.name || product.description)) {
          try {
            const searchText = createProductSearchText(product);
            product.embedding = await generateProductEmbedding(searchText);
          } catch (error) {
            console.warn(`Failed to generate embedding for ${product.name}:`, error);
          }
        }

        await storage.upsert("products", product);
        imported.push(product);
      } catch (error) {
        errors.push({
          line: i + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.status(201).json({
      success: imported.length > 0,
      imported: imported.length,
      failed: errors.length,
      products: imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Lookbook Endpoints
// ============================================================================

// Get all lookbooks
app.get("/api/lookbooks", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const lookbooks = await storage.list<Lookbook>("lookbooks", (l) => l.orgId === orgId);
    res.json(lookbooks);
  } catch (error) {
    console.error("Get lookbooks error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Create lookbook
app.post("/api/lookbooks", async (req, res) => {
  try {
    const { orgId = "default-org", title, description, products, isPublic = false } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const lookbook: Lookbook = {
      id: randomUUID(),
      orgId,
      title,
      description,
      products: products || [],
      isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert("lookbooks", lookbook);
    res.status(201).json(lookbook);
  } catch (error) {
    console.error("Create lookbook error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Store Settings Endpoints
// ============================================================================

// Get store settings
app.get("/api/store/settings", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    let settings = await storage.get<StoreSettings>("store_settings", orgId);

    if (!settings) {
      // Create default settings
      settings = {
        id: orgId,
        orgId,
        currency: "USD",
        isPublic: false,
        updatedAt: new Date().toISOString(),
      };
      await storage.upsert("store_settings", settings);
    }

    res.json(settings);
  } catch (error) {
    console.error("Get store settings error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update store settings
app.put("/api/store/settings", async (req, res) => {
  try {
    const orgId = req.body.orgId || "default-org";
    let settings = await storage.get<StoreSettings>("store_settings", orgId);

    if (!settings) {
      settings = {
        id: orgId,
        orgId,
        currency: "USD",
        isPublic: false,
        updatedAt: new Date().toISOString(),
      };
    }

    settings = {
      ...settings,
      ...req.body,
      id: orgId,
      orgId,
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert("store_settings", settings);
    res.json(settings);
  } catch (error) {
    console.error("Update store settings error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Public Store API (for customers)
// ============================================================================

// Get public products
app.get("/api/store/:orgId/products", async (req, res) => {
  try {
    const { orgId } = req.params;

    // Check if store is public
    const settings = await storage.get<StoreSettings>("store_settings", orgId);
    if (!settings?.isPublic) {
      return res.status(403).json({ error: "Store is not public" });
    }

    // Get active products only
    const products = await storage.list<Product>(
      "products",
      (p) => p.orgId === orgId && p.status === "active"
    );

    res.json(products);
  } catch (error) {
    console.error("Get public products error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get public product by ID
app.get("/api/store/:orgId/products/:productId", async (req, res) => {
  try {
    const { orgId, productId } = req.params;

    const settings = await storage.get<StoreSettings>("store_settings", orgId);
    if (!settings?.isPublic) {
      return res.status(403).json({ error: "Store is not public" });
    }

    const product = await storage.get<Product>("products", productId);
    if (!product || product.orgId !== orgId || product.status !== "active") {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get public product error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================================================
// Utility Functions
// ============================================================================

// Cosine similarity for vector search
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must be same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Escape CSV field
function escapeCSV(field: string): string {
  if (!field) return "";
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Parse CSV line (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

// ============================================================================
// Start Server
// ============================================================================

app.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
  console.log(`[${suiteApp.id}] Health check: http://localhost:${port}${suiteApp.routes.health}`);
});
