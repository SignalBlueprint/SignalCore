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

// ============================================================================
// Start Server
// ============================================================================

app.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
  console.log(`[${suiteApp.id}] Health check: http://localhost:${port}${suiteApp.routes.health}`);
});
