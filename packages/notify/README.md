# @sb/notify

Notification system for the Signal Blueprint suite supporting email, Slack, and Discord notifications.

## Purpose

`@sb/notify` provides a unified interface for sending notifications across multiple channels (email, Slack, Discord) with templating support and delivery tracking.

## Features

- **Multi-Channel** - Email, Slack, Discord support
- **Templating** - Message templates with variable substitution
- **Delivery Tracking** - Track notification delivery status
- **Queue System** - Reliable delivery with retries

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Send Email

```typescript
import { sendEmail } from "@sb/notify";

await sendEmail({
  to: "user@example.com",
  subject: "Welcome to Signal Blueprint",
  body: "Thank you for signing up!"
});
```

### Send Slack Message

```typescript
import { sendSlackMessage } from "@sb/notify";

await sendSlackMessage({
  channel: "#alerts",
  text: "Job failed: daily.questmaster"
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | No | SendGrid API key for email |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook URL |

## Testing

```bash
pnpm --filter @sb/notify test
```

## Dependencies

- `@sendgrid/mail` - Email delivery
- `@slack/webhook` - Slack integration
- `axios` - HTTP client for webhooks

## Used By

- **Outreach** - Campaign email sending (planned)
- **Worker** - Job failure notifications (planned)
- **Console** - System alerts (planned)

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
