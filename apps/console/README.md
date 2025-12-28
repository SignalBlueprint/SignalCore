# Console

Unified admin console for the Signal Blueprint suite - the home base for suite visibility and management.

## Purpose

Console serves as the command center for the suite, providing a single interface to view:
- Suite apps and their status
- Latest events across all apps
- Telemetry and AI cost statistics

## Features

- **Suite Apps** - List all apps from the suite registry with status and purpose
- **Events** - View the latest 200 events from the event log
- **Telemetry** - Monitor AI call counts, cache hit rates, and costs

## Running

```bash
pnpm --filter console dev
```

Then open http://localhost:4000 in your browser.

