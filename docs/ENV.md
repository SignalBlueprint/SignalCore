# Environment Variables

## Overview

Each app in the monorepo manages its own environment variables independently.

## Setup

1. Copy the `.env.example` file in the app directory to `.env`:
   ```bash
   cp apps/questboard/.env.example apps/questboard/.env
   ```

2. Fill in the required values in `.env`

3. **Never commit `.env` files** - they are included in `.gitignore`

## Best Practices

- Each app should have a `.env.example` file with all required variables (without sensitive values)
- Document required environment variables in each app's README
- Use descriptive variable names
- Group related variables together in the `.env.example` file
- Mark optional variables with a comment in `.env.example`

## Example Structure

```
apps/questboard/.env.example  # Template with required variables
apps/questboard/.env          # Local overrides (gitignored)
```

Packages typically don't need environment variables as they are libraries consumed by apps. If a package needs configuration, it should accept it via function parameters or constructor options.

