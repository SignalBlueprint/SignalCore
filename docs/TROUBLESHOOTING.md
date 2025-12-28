# Troubleshooting

## Environment Variables Not Loading

If you're getting errors like "OPENAI_API_KEY environment variable is not set", try these steps:

### 1. Verify .env file exists
```bash
# From repository root
ls -la .env
# Should show the .env file
```

### 2. Check .env file contents
```bash
# Make sure OPENAI_API_KEY is set (no spaces around =)
cat .env | grep OPENAI_API_KEY
```

### 3. Enable debug logging
```bash
# Set DEBUG_ENV=1 before running your app
DEBUG_ENV=1 pnpm --filter questboard dev
```

This will show:
- Where the .env file is being loaded from
- Whether the file exists
- Whether OPENAI_API_KEY was loaded

### 4. Test environment loading
```bash
# Run the test script
pnpm tsx tooling/scripts/test-env.ts
```

### 5. Common Issues

**Issue**: Running from wrong directory
- **Solution**: Always run commands from the repository root, or use `pnpm --filter <app> dev` which handles this automatically

**Issue**: .env file has wrong format
- **Solution**: Make sure there are no spaces around the `=` sign:
  ```
  OPENAI_API_KEY=sk-your-key-here  # ✓ Correct
  OPENAI_API_KEY = sk-your-key-here  # ✗ Wrong (spaces)
  ```

**Issue**: Environment variables set in shell but not loading
- **Solution**: The root .env file takes precedence. Remove shell env vars or use .env.local for overrides

**Issue**: Server was started before .env was created
- **Solution**: Restart the server after creating/updating .env file

### 6. Manual Verification

You can manually test if dotenv is working:
```bash
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY ? 'Key loaded' : 'Key not loaded');"
```

