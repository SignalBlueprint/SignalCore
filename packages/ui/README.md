# @sb/ui

Shared UI components and design system for the Signal Blueprint suite.

## Purpose

`@sb/ui` provides reusable React components, CSS utilities, and design tokens to ensure consistent UI/UX across all suite apps.

## Features

- **React Components** - Buttons, forms, modals, cards, etc.
- **Design Tokens** - Colors, spacing, typography
- **CSS Utilities** - Common styles and layouts
- **Responsive** - Mobile-first components

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Import Components

```typescript
import { Button, Card, Modal } from "@sb/ui";

function MyComponent() {
  return (
    <Card>
      <h2>Welcome</h2>
      <Button variant="primary" onClick={handleClick}>
        Get Started
      </Button>
    </Card>
  );
}
```

### Use Design Tokens

```typescript
import { colors, spacing } from "@sb/ui";

const styles = {
  backgroundColor: colors.primary,
  padding: spacing.md,
  margin: spacing.lg
};
```

## Components

- **Button** - Primary, secondary, and outline variants
- **Card** - Content container with shadow and padding
- **Modal** - Overlay modal with backdrop
- **Form** - Form inputs with validation
- **Badge** - Status indicators and labels
- **Spinner** - Loading indicator
- **Toast** - Notification messages

## Testing

```bash
pnpm --filter @sb/ui test
```

## Dependencies

- `react` - React library
- `react-dom` - React DOM

## Used By

All apps with web interfaces:
- Questboard
- Catalog
- Console
- LeadScout
- Outreach
- SiteForge

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
