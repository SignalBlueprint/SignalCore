# Questboard Web UI

React + Vite frontend for Questboard.

## Development

To run both the API server and the React dev server:

```bash
# From apps/questboard directory
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1: API server (port 3000)
npm run dev

# Terminal 2: React dev server (port 5173)
npm run dev:web
```

The Vite dev server proxies `/api` and `/health` requests to the Express server on port 3000.

## Building

```bash
npm run build
```

This builds both the TypeScript server and the React app. The built React app is output to `dist/web/`.

## Production

The Express server serves the built React app from `dist/web/` when `NODE_ENV=production`.

