# @sb/integrations-github

GitHub API integration utilities for the Signal Blueprint suite.

## Purpose

`@sb/integrations-github` provides helpers for integrating with GitHub, including creating and updating issues, managing labels, and syncing task status.

## Features

- **Issue Management** - Create, update, and close GitHub issues
- **Label Sync** - Sync task status with issue labels
- **Bi-directional Sync** - Keep tasks and issues in sync
- **Authentication** - GitHub token management

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Create GitHub Issue

```typescript
import { createIssue } from "@sb/integrations-github";

const issue = await createIssue({
  repo: "owner/repo",
  title: "Fix login bug",
  body: "Users cannot login with email",
  labels: ["bug", "priority:high"]
});

console.log(`Created issue #${issue.number}`);
```

### Update Issue

```typescript
import { updateIssue } from "@sb/integrations-github";

await updateIssue({
  repo: "owner/repo",
  issueNumber: 123,
  state: "closed",
  labels: ["bug", "fixed"]
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub personal access token |

## Testing

```bash
pnpm --filter @sb/integrations-github test
```

## Dependencies

- `@octokit/rest` - GitHub API client

## Used By

- **Worker** - GitHub sync job
- **Questboard** - Task-to-issue synchronization

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
