# @sb/cache

Simple in-memory caching system for the Signal Blueprint suite with hash-based keys and JSON serialization.

## Purpose

`@sb/cache` provides a lightweight caching layer for expensive operations, particularly AI API calls. It uses content-based hashing for cache keys to ensure identical inputs return cached results, reducing costs and improving performance.

## Features

- **Content-Based Hashing** - SHA-256 hashing of inputs for cache keys
- **JSON Serialization** - Automatic JSON stringify/parse for objects
- **In-Memory Storage** - Fast access with Map-based storage
- **Simple API** - Just 3 functions: `hashInput`, `getJson`, `setJson`
- **Type-Safe** - Generic functions with TypeScript support

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Basic Caching

```typescript
import { hashInput, getJson, setJson } from "@sb/cache";

// Generate cache key from input
const inputHash = hashInput("What is the weather?");

// Check cache
const cached = getJson<string>(inputHash);
if (cached !== null) {
  console.log("Cache hit!", cached);
  return cached;
}

// Cache miss - compute result
const result = await expensiveOperation();

// Store in cache
setJson(inputHash, result);

return result;
```

### Caching AI Responses

```typescript
import { hashInput, getJson, setJson } from "@sb/cache";
import OpenAI from "openai";

async function callAI(prompt: string) {
  const inputHash = hashInput(prompt);

  // Check cache first
  const cached = getJson<string>(inputHash);
  if (cached !== null) {
    console.log("Returning cached AI response");
    return cached;
  }

  // Make AI call
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });

  const result = response.choices[0].message.content;

  // Cache the response
  setJson(inputHash, result);

  return result;
}
```

### Caching Complex Objects

```typescript
import { hashInput, getJson, setJson } from "@sb/cache";

interface ProductAnalysis {
  name: string;
  category: string;
  tags: string[];
  suggestedPrice: number;
}

async function analyzeProduct(imageUrl: string) {
  const inputHash = hashInput(imageUrl);

  // Try cache
  const cached = getJson<ProductAnalysis>(inputHash);
  if (cached !== null) {
    return cached;
  }

  // Analyze with AI
  const analysis = await aiVisionAnalysis(imageUrl);

  // Cache result
  setJson(inputHash, analysis);

  return analysis;
}
```

### Cache Key from Multiple Inputs

```typescript
import { hashInput } from "@sb/cache";

// Combine multiple inputs into cache key
const cacheKey = hashInput(
  JSON.stringify({
    prompt: userPrompt,
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 500
  })
);
```

## API Reference

### `hashInput(input: string): string`

Generate a SHA-256 hash from input string.

**Parameters:**
- `input` - String to hash (use `JSON.stringify()` for objects)

**Returns:** Hexadecimal hash string

**Example:**
```typescript
const hash = hashInput("hello world");
// "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
```

### `getJson<T>(key: string): T | null`

Retrieve cached value by key.

**Type Parameter:**
- `T` - Expected type of cached value

**Parameters:**
- `key` - Cache key (typically from `hashInput`)

**Returns:** Cached value or null if not found

**Example:**
```typescript
const result = getJson<ProductAnalysis>(inputHash);
if (result !== null) {
  // Use cached result
}
```

### `setJson<T>(key: string, value: T): void`

Store value in cache.

**Type Parameter:**
- `T` - Type of value to cache

**Parameters:**
- `key` - Cache key (typically from `hashInput`)
- `value` - Value to cache (will be JSON serialized)

**Example:**
```typescript
setJson(inputHash, { name: "Product", price: 29.99 });
```

## Caching Best Practices

### 1. Use Content-Based Keys

Always hash the complete input that affects the output:

```typescript
// ✅ GOOD - Hash includes all parameters
const key = hashInput(JSON.stringify({
  prompt,
  model,
  temperature,
  systemMessage
}));

// ❌ BAD - Might miss different parameters
const key = hashInput(prompt);
```

### 2. Cache Expensive Operations Only

Cache operations that are:
- Expensive (AI calls, external APIs)
- Deterministic (same input → same output)
- Frequently repeated

```typescript
// ✅ GOOD - AI call is expensive
const hash = hashInput(prompt);
const cached = getJson(hash);
if (cached) return cached;
const result = await openai.chat.completions.create(...);
setJson(hash, result);

// ❌ BAD - Database lookup is fast
const hash = hashInput(id);
const cached = getJson(hash);
// Just query the database directly
```

### 3. Handle Cache Invalidation

Current implementation doesn't have TTL or invalidation. For time-sensitive data, include timestamps in cache keys:

```typescript
const today = new Date().toISOString().split('T')[0];
const key = hashInput(`${prompt}_${today}`);
// Cache expires daily
```

### 4. Type Your Cached Values

Always specify the type parameter for type safety:

```typescript
// ✅ GOOD - Type safe
const result = getJson<ProductAnalysis>(hash);
if (result) {
  console.log(result.suggestedPrice); // TypeScript knows this exists
}

// ❌ BAD - No type safety
const result = getJson(hash);
console.log(result.suggestedPrice); // TypeScript error
```

## Limitations

### No Persistence

Cache is in-memory only and cleared on server restart. For persistent caching, consider:
- Redis
- Database caching layer
- File-based cache

### No TTL/Expiration

Cached values never expire. Workarounds:
- Include date in cache key for daily expiration
- Manually clear cache by restarting server
- Implement custom eviction logic

### No Size Limits

Cache grows unbounded. Monitor memory usage for long-running processes.

### Single-Process Only

Cache is not shared across processes or servers. For distributed caching:
- Use Redis
- Implement shared cache service
- Use database-backed cache

## Performance

Typical performance characteristics:
- **Hash generation:** ~0.1ms per hash
- **Cache get:** ~0.01ms (Map lookup)
- **Cache set:** ~0.01ms (Map insert)

## Testing

```bash
# Run cache tests
pnpm --filter @sb/cache test
```

## Dependencies

None - uses only Node.js built-ins (`crypto`)

## Used By

- **@sb/ai** - Cache AI responses to reduce API costs
- **@sb/telemetry** - Cache hit rate tracking
- All apps using AI features

## Future Enhancements

Potential improvements:
- [ ] TTL/expiration support
- [ ] LRU eviction policy
- [ ] Persistent storage option
- [ ] Cache statistics (hit rate, size)
- [ ] Redis backend option
- [ ] Cache warming/preloading

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
