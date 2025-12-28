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


