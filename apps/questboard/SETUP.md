# Questboard Setup

## ⚠️ Important: Access the React App on Port 5173

The **React app runs on port 5173** (Vite dev server). Do NOT access the Express server directly on port 3000 - that still serves the old vanilla JS app.

## Development Mode

### Start both servers:

```bash
cd apps/questboard
npm run dev:all
```

Or separately in two terminals:
```bash
# Terminal 1: Express API server (port 3000)
cd apps/questboard
npm run dev

# Terminal 2: React dev server (port 5173) 
cd apps/questboard/web
npm run dev
```

### Access the app:

- **✅ React UI (USE THIS)**: http://localhost:5173
  - Navigate to `/today`, `/sprint`, `/debug`
  - This is the React app with routing
  
- **❌ Express server (old app)**: http://localhost:3000 
  - This still serves the old vanilla JS app
  - Only use this for direct API access: http://localhost:3000/api/status

The React app on port 5173 will proxy all `/api/*` requests to the Express server on port 3000.

## Production Mode

```bash
cd apps/questboard
npm run build
NODE_ENV=production npm run dev
```

The Express server will serve the built React app and handle API routes. Access it at http://localhost:3000.

