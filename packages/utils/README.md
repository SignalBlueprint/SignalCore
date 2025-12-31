# @sb/utils

Shared utility functions and helpers for the Signal Blueprint suite.

## Purpose

`@sb/utils` provides common utility functions used across apps and packages including string manipulation, date formatting, ID generation, and data transformation.

## Features

- **ID Generation** - Generate unique IDs for entities
- **String Utils** - camelCase, snake_case, kebab-case conversion
- **Date Utils** - Format dates, calculate durations
- **Data Utils** - Deep clone, merge, pick, omit
- **Validation** - Email, URL, phone validation

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Generate IDs

```typescript
import { generateId } from "@sb/utils";

const id = generateId("prod"); // "prod_abc123xyz"
const taskId = generateId("task"); // "task_def456uvw"
```

### String Utilities

```typescript
import { toCamelCase, toSnakeCase } from "@sb/utils";

toCamelCase("first_name"); // "firstName"
toSnakeCase("firstName"); // "first_name"
```

### Date Utilities

```typescript
import { formatDate, daysAgo } from "@sb/utils";

formatDate(new Date()); // "2025-12-31"
daysAgo(7); // Date 7 days ago
```

### Validation

```typescript
import { isValidEmail, isValidUrl } from "@sb/utils";

isValidEmail("user@example.com"); // true
isValidUrl("https://example.com"); // true
```

## API Reference

### ID Generation
- `generateId(prefix)` - Generate unique ID with prefix

### String Utils
- `toCamelCase(str)` - Convert to camelCase
- `toSnakeCase(str)` - Convert to snake_case
- `toKebabCase(str)` - Convert to kebab-case
- `capitalize(str)` - Capitalize first letter

### Date Utils
- `formatDate(date)` - Format as YYYY-MM-DD
- `formatDateTime(date)` - Format as ISO string
- `daysAgo(n)` - Date n days ago
- `hoursAgo(n)` - Date n hours ago

### Data Utils
- `deepClone(obj)` - Deep clone object
- `merge(target, source)` - Deep merge objects
- `pick(obj, keys)` - Pick specific keys
- `omit(obj, keys)` - Omit specific keys

### Validation
- `isValidEmail(email)` - Validate email format
- `isValidUrl(url)` - Validate URL format
- `isValidPhone(phone)` - Validate phone number

## Testing

```bash
pnpm --filter @sb/utils test
```

## Dependencies

None - uses only JavaScript/TypeScript built-ins

## Used By

All apps and packages for common utilities

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
