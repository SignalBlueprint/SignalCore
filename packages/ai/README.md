# @sb/ai

AI utilities and integrations for the Signal Blueprint suite with built-in caching, telemetry tracking, and OpenAI integration.

## Purpose

`@sb/ai` provides a standardized way to integrate AI capabilities across all apps in the suite. It includes OpenAI client wrappers with automatic caching, structured output support, vision analysis for product images, and image generation capabilities.

## Features

### Core AI Functions
- **Automatic Caching** - AI responses are cached to reduce costs and improve performance
- **Telemetry Tracking** - All AI calls are tracked for cost monitoring and analytics
- **Event Publishing** - AI operations publish events for suite-wide monitoring
- **Structured Outputs** - JSON Schema-based structured outputs with type safety

### OpenAI Integrations
- **Chat Completions** - GPT-4/GPT-4o-mini text generation with caching
- **Vision Analysis** - Product image analysis with GPT-4o Vision
- **Image Generation** - DALL-E 3 integration for product shot generation
- **Structured Responses** - Type-safe JSON outputs with schema validation

### Specialized Modules
- **Questboard AI** - Sprint planning and task assignment with Working Genius
- **Product Vision** - E-commerce product analysis and metadata extraction
- **Image Generation** - Clean product shot generation for catalogs
- **Org Context** - Organization-aware AI prompts and responses

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Basic AI Call with Caching

```typescript
import { callAi } from "@sb/ai";

const result = await callAi({
  input: "Generate a product description for...",
  model: "gpt-4",
  useCache: true
});

if (result.cached) {
  console.log("Used cached result - no API cost!");
}
console.log(result.result);
```

### Structured Output with JSON Schema

```typescript
import { runQuestboardFunction } from "@sb/ai";
import { DecompositionSchema } from "@sb/schemas";

const result = await runQuestboardFunction({
  functionName: "decomposeGoal",
  input: {
    goal: "Launch new product feature",
    teamMembers: [...]
  },
  schema: DecompositionSchema
});

// result.result is typed according to DecompositionSchema
console.log(result.result.questlines);
```

### Product Image Analysis

```typescript
import { analyzeProductImage } from "@sb/ai";

const analysis = await analyzeProductImage({
  imageUrl: "https://example.com/product.jpg",
  detailLevel: "high"
});

console.log(analysis.detectedName);
console.log(analysis.description);
console.log(analysis.suggestedPrice);
console.log(analysis.tags);
```

### Generate Clean Product Shot

```typescript
import { generateProductShot } from "@sb/ai";

const result = await generateProductShot({
  productName: "Blue Cotton T-Shirt",
  description: "Comfortable everyday wear",
  style: "clean white background"
});

console.log(result.imageUrl); // DALL-E 3 generated image
console.log(result.revisedPrompt);
```

## API Reference

### Core Functions

#### `callAi<T>(options: AiCallOptions): Promise<AiCallResult<T>>`

Make an AI call with automatic caching and telemetry.

**Parameters:**
- `input` (string) - The prompt or input text
- `model` (string) - Model to use (default: "gpt-4")
- `useCache` (boolean) - Enable caching (default: true)

**Returns:**
- `result` - The AI response
- `cached` - Whether the result was from cache
- `inputHash` - Hash of the input for cache key

#### `runStructured<T>(options: StructuredCallOptions): Promise<AiCallResult<T>>`

Make a structured AI call with JSON Schema validation.

**Parameters:**
- `system` (string) - System prompt
- `user` (string) - User prompt
- `format` (JsonSchemaFormat) - JSON Schema for output
- `model` (string) - Model to use (default: "gpt-4o-mini")
- `maxOutputTokens` (number) - Max tokens (default: 1200)
- `useCache` (boolean) - Enable caching (default: true)

### Vision Functions

#### `analyzeProductImage(options: AnalyzeProductImageOptions): Promise<VisionAnalysis>`

Analyze a product image using GPT-4o Vision.

**Parameters:**
- `imageUrl` OR `imageBase64` - Product image
- `detailLevel` - "low" | "high" | "auto" (default: "high")
- `customPrompt` - Optional custom analysis prompt

**Returns:** `VisionAnalysis` object with:
- `detectedName` - Product name
- `description` - Detailed description
- `category` - Product category
- `colors` - Detected colors
- `materials` - Detected materials
- `suggestedPrice` - Price suggestion
- `tags` - Generated tags

### Image Generation Functions

#### `generateProductShot(options: GenerateProductShotOptions): Promise<ImageGenerationResult>`

Generate a clean product shot using DALL-E 3.

**Parameters:**
- `productName` (string) - Name of the product
- `description` (string) - Product description
- `style` (string) - Optional style (default: "clean white background")
- `size` - "1024x1024" | "1792x1024" | "1024x1792"
- `quality` - "standard" | "hd"

**Returns:** `ImageGenerationResult` with:
- `imageUrl` - Generated image URL
- `revisedPrompt` - DALL-E's revised prompt

### Questboard Functions

#### `runQuestboardFunction(options: QuestboardFunctionOptions): Promise<AiCallResult>`

Run Questboard-specific AI functions (sprint planning, task assignment).

**Available Functions:**
- `decomposeGoal` - Break down goals into questlines
- `expandQuestline` - Generate quests for a questline
- `generateSprintPlan` - Create AI-powered sprint plan
- `evaluatePlans` - Compare and select best sprint plan

## Caching Behavior

All AI functions automatically cache responses using `@sb/cache`:
- Cache key is generated from input hash
- Cached responses return instantly with no API cost
- Cache can be disabled with `useCache: false`
- Cache is persistent across server restarts

## Telemetry Integration

All AI calls are automatically tracked via `@sb/telemetry`:
- Total AI calls (cached + fresh)
- Cache hit rate
- Token usage (when available)
- Cost tracking
- Call duration

View telemetry in the Console app dashboard.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for all AI features |

Set in root `.env` file.

## Testing

```bash
# Run tests
pnpm --filter @sb/ai test

# Run tests in watch mode
pnpm --filter @sb/ai test:watch
```

The package includes comprehensive tests for:
- Caching behavior
- Telemetry tracking
- Questboard AI functions
- Schema validation
- Org context handling

## Dependencies

- `@sb/cache` - Response caching
- `@sb/events` - Event publishing
- `@sb/schemas` - Type definitions
- `@sb/storage` - Data persistence
- `@sb/telemetry` - Usage tracking
- `openai` - OpenAI SDK

## Used By

- **Questboard** - Sprint planning and task assignment
- **Catalog** - Product analysis and image generation
- **LeadScout** - Lead intelligence and scoring
- **Outreach** - Campaign message generation
- **SiteForge** - Website content generation

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
