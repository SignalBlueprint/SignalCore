# @sb/events

Event publishing system for inter-app communication and activity tracking across the Signal Blueprint suite.

## Purpose

`@sb/events` provides a centralized event system that allows apps to publish and subscribe to events. This enables loose coupling between apps, activity tracking, audit logging, and real-time notifications.

## Features

- **Event Publishing** - Publish events with type-safe payloads
- **Event Metadata** - Automatic timestamps and source app tracking
- **Type-Safe** - TypeScript support for event types and payloads
- **Simple API** - Just `publish()` and `subscribe()`
- **Persistent Storage** - Events stored in database for audit trail
- **Activity Timeline** - View all suite activity in Console app

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Publishing Events

```typescript
import { publish } from "@sb/events";

// Publish an event
await publish("product.created", {
  productId: "prod_123",
  name: "Blue T-Shirt",
  price: 29.99
}, {
  sourceApp: "catalog"
});

// Event is automatically stored with timestamp and metadata
```

### Common Event Types

```typescript
// Task events
await publish("task.created", { taskId, title }, { sourceApp: "questboard" });
await publish("task.completed", { taskId }, { sourceApp: "questboard" });

// Lead events
await publish("lead.scored", { leadId, score }, { sourceApp: "leadscout" });
await publish("lead.qualified", { leadId }, { sourceApp: "leadscout" });

// Campaign events
await publish("campaign.started", { campaignId }, { sourceApp: "outreach" });
await publish("campaign.sent", { campaignId, count }, { sourceApp: "outreach" });

// AI events
await publish("ai.run", {
  model: "gpt-4",
  cached: false,
  duration: 1234
}, { sourceApp: "ai" });

// Job events
await publish("job.completed", { jobId, duration }, { sourceApp: "worker" });
await publish("job.failed", { jobId, error }, { sourceApp: "worker" });
```

### Subscribing to Events

```typescript
import { subscribe } from "@sb/events";

// Subscribe to specific event type
subscribe("product.created", (event) => {
  console.log("New product:", event.payload.productId);
  console.log("Created at:", event.timestamp);
  console.log("Source:", event.metadata.sourceApp);
});

// Subscribe to all events
subscribe("*", (event) => {
  console.log(`Event: ${event.type}`, event.payload);
});
```

### Event Structure

```typescript
interface Event {
  id: string;                    // Unique event ID
  type: string;                  // Event type (e.g., "product.created")
  payload: Record<string, any>;  // Event data
  timestamp: string;             // ISO timestamp
  metadata: {
    sourceApp: string;           // App that published the event
    [key: string]: any;          // Additional metadata
  };
}
```

## Event Naming Conventions

Use dot notation with `resource.action` pattern:

```typescript
// ✅ GOOD
"product.created"
"lead.scored"
"campaign.sent"
"task.completed"

// ❌ BAD
"productCreated"
"LEAD_SCORED"
"send_campaign"
```

## API Reference

### `publish(type, payload, metadata): Promise<void>`

Publish an event to the system.

**Parameters:**
- `type` (string) - Event type (e.g., "product.created")
- `payload` (object) - Event data
- `metadata` (object) - Metadata including `sourceApp`

**Example:**
```typescript
await publish("order.completed", {
  orderId: "ord_123",
  total: 99.99
}, {
  sourceApp: "catalog",
  userId: "user_456"
});
```

### `subscribe(type, handler): void`

Subscribe to events.

**Parameters:**
- `type` (string) - Event type or "*" for all events
- `handler` (function) - Callback function `(event) => void`

**Example:**
```typescript
subscribe("lead.qualified", (event) => {
  sendNotification(event.payload.leadId);
});
```

## Event Storage

Events are stored in the database for:
- **Audit Trail** - Track all system activity
- **Debugging** - Investigate issues by reviewing event timeline
- **Analytics** - Analyze patterns and trends
- **Compliance** - Maintain records of data changes

View events in the Console app at `/activity`.

## Use Cases

### 1. Activity Timeline

```typescript
// Apps publish events
await publish("sprint.planned", { sprintId, tasks: 15 }, { sourceApp: "questboard" });
await publish("lead.imported", { count: 50 }, { sourceApp: "leadscout" });

// Console displays activity feed
// "Sprint planned with 15 tasks - 2 hours ago"
// "Imported 50 leads - 3 hours ago"
```

### 2. Inter-App Communication

```typescript
// LeadScout creates qualified lead
await publish("lead.qualified", {
  leadId: "lead_123",
  score: 95,
  companyName: "Acme Corp"
}, { sourceApp: "leadscout" });

// Outreach listens and adds to campaign
subscribe("lead.qualified", async (event) => {
  if (event.payload.score > 90) {
    await addToCampaign(event.payload.leadId);
  }
});
```

### 3. Audit Logging

```typescript
// Track data modifications
await publish("product.updated", {
  productId: "prod_123",
  changes: { price: { from: 29.99, to: 24.99 } },
  userId: "user_456"
}, { sourceApp: "catalog" });

// Query audit trail later
const events = await storage.list("events",
  (e) => e.type.startsWith("product.")
);
```

### 4. Real-Time Notifications

```typescript
// Worker completes job
await publish("job.completed", {
  jobId: "daily.questmaster",
  tasksProcessed: 42,
  duration: 5000
}, { sourceApp: "worker" });

// Console shows notification
subscribe("job.completed", (event) => {
  showToast(`Job ${event.payload.jobId} completed`);
});
```

## Event Best Practices

### 1. Include Relevant IDs

Always include entity IDs in payload:

```typescript
// ✅ GOOD - Includes IDs for lookup
await publish("task.assigned", {
  taskId: "task_123",
  memberId: "member_456",
  assignedBy: "user_789"
}, { sourceApp: "questboard" });

// ❌ BAD - No way to identify entities
await publish("task.assigned", {
  title: "Fix bug"
}, { sourceApp: "questboard" });
```

### 2. Use Past Tense for Actions

```typescript
// ✅ GOOD
"product.created"
"lead.scored"
"campaign.sent"

// ❌ BAD
"product.create"
"lead.score"
"campaign.send"
```

### 3. Include Context in Metadata

```typescript
await publish("order.placed", {
  orderId: "ord_123"
}, {
  sourceApp: "catalog",
  userId: "user_456",      // Who did it
  sessionId: "sess_789",   // Request context
  ipAddress: "192.168.1.1" // Additional context
});
```

### 4. Don't Publish PII

Avoid putting sensitive data in events:

```typescript
// ✅ GOOD - Just IDs
await publish("user.created", {
  userId: "user_123"
}, { sourceApp: "console" });

// ❌ BAD - Contains PII
await publish("user.created", {
  userId: "user_123",
  email: "user@example.com",
  password: "..." // Never do this!
}, { sourceApp: "console" });
```

## Testing

```bash
# Run event tests
pnpm --filter @sb/events test
```

## Dependencies

- `@sb/storage` - Event persistence

## Used By

All apps publish events:
- **Questboard** - Task/quest/goal events
- **Catalog** - Product/order events
- **LeadScout** - Lead scoring events
- **Outreach** - Campaign events
- **Worker** - Job execution events
- **@sb/ai** - AI usage events
- **Console** - Activity timeline display

## Future Enhancements

Potential improvements:
- [ ] WebSocket/SSE for real-time event streaming
- [ ] Event replay for debugging
- [ ] Event filtering and querying API
- [ ] Event retention policies
- [ ] Event versioning
- [ ] Dead letter queue for failed handlers

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
