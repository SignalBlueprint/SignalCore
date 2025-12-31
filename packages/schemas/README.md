# @sb/schemas

Centralized type definitions and Zod schemas for data validation across the Signal Blueprint suite.

## Purpose

`@sb/schemas` provides a single source of truth for all data types used throughout the suite. It includes TypeScript interfaces, Zod validation schemas, and type guards to ensure data consistency across apps and packages.

## Features

- **Type Safety** - TypeScript interfaces for all entities and data structures
- **Runtime Validation** - Zod schemas for validating data at runtime
- **Shared Types** - Consistent types across all apps and packages
- **Schema-First Design** - Define data contracts once, use everywhere
- **Validation Helpers** - Pre-built validators for common patterns

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Basic Type Usage

```typescript
import type { Product, Lead, Campaign } from "@sb/schemas";

const product: Product = {
  id: "prod_123",
  orgId: "org_1",
  name: "Blue T-Shirt",
  price: 29.99,
  status: "active",
  createdAt: new Date().toISOString()
};
```

### Runtime Validation with Zod

```typescript
import { ProductSchema, LeadSchema } from "@sb/schemas";

// Validate data
const result = ProductSchema.safeParse(data);

if (!result.success) {
  console.error("Validation errors:", result.error.errors);
  return;
}

const product = result.data; // Typed as Product
```

### API Request Validation

```typescript
import express from "express";
import { CreateProductSchema } from "@sb/schemas";

app.post("/api/products", async (req, res) => {
  const validation = CreateProductSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.error.errors
    });
  }

  const product = await createProduct(validation.data);
  res.json(product);
});
```

## Available Schemas

### Core Entities

- **Product** - E-commerce products (Catalog app)
- **Lead** - Sales leads (LeadScout app)
- **Campaign** - Outreach campaigns (Outreach app)
- **Task** - Todo items (Questboard app)
- **Quest** - Task bundles (Questboard app)
- **Questline** - Quest sequences (Questboard app)
- **Goal** - Strategic objectives (Questboard app)
- **TeamMember** - Team member profiles
- **Project** - Website projects (SiteForge app)
- **GenerationJob** - Site generation jobs (SiteForge app)

### Supporting Types

- **VisionAnalysis** - AI vision analysis results
- **Cart** - Shopping cart data
- **Order** - E-commerce orders
- **Lookbook** - Product collections
- **WorkingGenius** - Working Genius profiles
- **SprintPlan** - Sprint planning data
- **OrgContext** - Organization context

## Common Patterns

### Entity Base Types

All entities extend a common base:

```typescript
interface BaseEntity {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Status Enums

```typescript
type ProductStatus = "draft" | "active" | "out_of_stock";
type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
type CampaignStatus = "draft" | "active" | "paused" | "completed";
```

## Testing

```bash
# Run schema tests
pnpm --filter @sb/schemas test
```

## Dependencies

- `zod` - Runtime validation

## Used By

All apps and packages use `@sb/schemas` for type safety and validation:
- `@sb/ai` - AI function schemas
- `@sb/storage` - Entity type definitions
- All apps - Data validation and type safety

## Contributing

When adding new types:

1. Define TypeScript interface
2. Create corresponding Zod schema
3. Export from `src/index.ts`
4. Add tests for validation
5. Update this README

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
