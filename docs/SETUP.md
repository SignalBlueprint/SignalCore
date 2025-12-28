# Setup Guide

## Initial Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your API keys
   # Required: OPENAI_API_KEY (for AI features)
   # Optional: SUPABASE_URL, SUPABASE_ANON_KEY (for database)
   ```

3. **Start Development**
   ```bash
   # Run all apps
   pnpm dev
   
   # Or run a specific app
   pnpm --filter questboard dev
   ```

## Environment Variables

### Required

- **OPENAI_API_KEY** - OpenAI API key for AI features (goal clarification, decomposition)
  - Get from: https://platform.openai.com/api-keys
  - Format: `sk-...`

### Optional

- **SUPABASE_URL** - Supabase project URL (if using Supabase storage)
- **SUPABASE_ANON_KEY** - Supabase anonymous key (if using Supabase storage)
- **PORT** - Server port (default: 3000)
- **NODE_ENV** - Environment mode (development/production)
- **LOG_LEVEL** - Logging level (debug/info/warn/error)

See [ENV.md](./ENV.md) for complete documentation.

## Troubleshooting

### "OpenAI API key not configured"
- Make sure you've created `.env` from `.env.example`
- Verify `OPENAI_API_KEY` is set in `.env`
- Restart your development server after adding the key

### Environment variables not loading
- Ensure `.env` is in the project root
- Some apps may need environment variables loaded via `dotenv` - check app-specific README

