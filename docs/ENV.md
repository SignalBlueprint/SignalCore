# Environment Variables

## Overview

The monorepo uses a **single root-level `.env` file** for all environment variables. All apps and packages automatically load environment variables from the root `.env` file via the `@sb/config` package.

This centralized approach means:
- One place to manage all API keys and configuration
- Consistent environment variables across all apps
- Easier setup for new developers

## Setup

1. Copy the root `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values in `.env`:
   - **OPENAI_API_KEY** (required) - For AI features like goal clarification and decomposition
   - **SUPABASE_URL** and **SUPABASE_ANON_KEY** (optional) - If using Supabase for storage
   - Other variables as needed

3. **Never commit `.env` files** - they are included in `.gitignore`
   
   Note: `.env.example` is committed as a template for other developers.

## How It Works

The `@sb/config` package automatically:
1. Finds the repository root directory (by looking for `.env.example` or `package.json` with name "signal-blueprint")
2. Loads the `.env` file from the root
3. Optionally loads `.env.local` for local overrides (if it exists)

All apps that import `@sb/config` (or any package that imports it) will automatically have access to the root `.env` variables.

## Local Overrides

You can create a `.env.local` file in the root for local-only overrides. Variables in `.env.local` will override those in `.env`. This is useful for:
- Developer-specific API keys
- Local development settings
- Temporary configuration changes

**Note**: `.env.local` is also in `.gitignore` and should never be committed.

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

## Notification Configuration

The `@sb/notify` package uses the following environment variables:

- `NOTIFY_SLACK_ENABLED` - Set to `"true"` to enable Slack notifications (default: disabled)
- `NOTIFY_EMAIL_ENABLED` - Set to `"true"` to enable email notifications (default: disabled)
- `SLACK_WEBHOOK_URL` - Slack incoming webhook URL (optional, for webhook-based notifications)
- `SLACK_BOT_TOKEN` - Slack bot token (optional, for bot API-based notifications)

At least one of `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` must be set if `NOTIFY_SLACK_ENABLED=true`.

Example `.env`:
```
NOTIFY_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
NOTIFY_EMAIL_ENABLED=false
```

## GitHub Integration Configuration

The `@sb/integrations-github` package uses the following environment variable:

- `GITHUB_TOKEN` - GitHub personal access token or OAuth token (required for GitHub sync)

The token must have the following permissions:
- `repo` scope (for private repositories) or `public_repo` scope (for public repositories only)
- `issues:write` permission to create and update issues

Example `.env`:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Note**: Never commit your `GITHUB_TOKEN` to version control. Always use environment variables or secure secret management.


