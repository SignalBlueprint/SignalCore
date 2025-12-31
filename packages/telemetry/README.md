# @sb/telemetry

AI usage tracking and cost monitoring for the Signal Blueprint suite.

## Purpose

`@sb/telemetry` tracks AI API calls, token usage, cache hits, and costs across all apps. It provides insights into AI usage patterns, helps optimize caching strategies, and monitors API expenses.

## Features

- **Call Tracking** - Record every AI API call with metadata
- **Cache Metrics** - Track cache hit rate to measure efficiency
- **Token Usage** - Monitor input and output tokens
- **Cost Calculation** - Estimate API costs based on usage
- **Suite-Wide Visibility** - Aggregate metrics across all apps

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Recording AI Calls

```typescript
import { recordAiCall } from "@sb/telemetry";

// Record a cached AI call
recordAiCall({
  model: "gpt-4",
  inputHash: "abc123...",
  cached: true,
  duration: 5 // milliseconds
});

// Record a fresh AI call with tokens
recordAiCall({
  model: "gpt-4o-mini",
  inputHash: "def456...",
  cached: false,
  duration: 1234,
  tokens: {
    input: 150,
    output: 300
  },
  cost: 0.002 // USD
});
```

### Viewing Metrics

Telemetry data is displayed in the Console app at `/telemetry`:
- Total AI calls
- Cache hit rate percentage
- Total tokens consumed
- Estimated costs
- Breakdown by model

### Getting Telemetry State

```typescript
import { getTelemetryState } from "@sb/telemetry";

const state = getTelemetryState();
console.log(`Total calls: ${state.totalCalls}`);
console.log(`Cache hits: ${state.cacheHits}`);
console.log(`Hit rate: ${(state.cacheHits / state.totalCalls * 100).toFixed(1)}%`);
console.log(`Total cost: $${state.totalCost.toFixed(2)}`);
```

## API Reference

### `recordAiCall(data): void`

Record an AI API call.

**Parameters:**
- `model` (string) - AI model used (e.g., "gpt-4", "gpt-4o-mini")
- `inputHash` (string) - Hash of input for tracking
- `cached` (boolean) - Whether result was from cache
- `duration` (number) - Call duration in milliseconds
- `tokens` (object, optional) - Token usage `{ input, output }`
- `cost` (number, optional) - Estimated cost in USD

### `getTelemetryState(): TelemetryState`

Get current telemetry state.

**Returns:**
```typescript
{
  totalCalls: number;
  cacheHits: number;
  freshCalls: number;
  totalTokens: number;
  totalCost: number;
  byModel: Map<string, ModelStats>;
}
```

## Cost Estimation

Costs are calculated based on OpenAI pricing:
- GPT-4: $0.03/1K input tokens, $0.06/1K output tokens
- GPT-4o-mini: $0.00015/1K input tokens, $0.0006/1K output tokens
- DALL-E 3: Varies by size/quality

## Testing

```bash
pnpm --filter @sb/telemetry test
```

## Dependencies

None - standalone package

## Used By

- **@sb/ai** - Records all AI calls automatically
- **Console** - Displays telemetry dashboard
- All apps using AI features

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
