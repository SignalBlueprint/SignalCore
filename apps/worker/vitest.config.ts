import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@sb/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@sb/assignment': path.resolve(__dirname, '../../packages/assignment/src'),
      '@sb/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@sb/cache': path.resolve(__dirname, '../../packages/cache/src'),
      '@sb/config': path.resolve(__dirname, '../../packages/config/src'),
      '@sb/db': path.resolve(__dirname, '../../packages/db/src'),
      '@sb/events': path.resolve(__dirname, '../../packages/events/src'),
      '@sb/integrations-github': path.resolve(__dirname, '../../packages/integrations-github/src'),
      '@sb/jobs': path.resolve(__dirname, '../../packages/jobs/src'),
      '@sb/logger': path.resolve(__dirname, '../../packages/logger/src'),
      '@sb/notify': path.resolve(__dirname, '../../packages/notify/src'),
      '@sb/rbac': path.resolve(__dirname, '../../packages/rbac/src'),
      '@sb/schemas': path.resolve(__dirname, '../../packages/schemas/src'),
      '@sb/storage': path.resolve(__dirname, '../../packages/storage/src'),
      '@sb/suite': path.resolve(__dirname, '../../packages/suite/src'),
      '@sb/telemetry': path.resolve(__dirname, '../../packages/telemetry/src'),
      '@sb/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@sb/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
})
