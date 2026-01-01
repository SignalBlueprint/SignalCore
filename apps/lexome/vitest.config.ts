import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
      ],
    },
    server: {
      deps: {
        inline: ['@sb/storage', '@sb/cache', '@sb/ai', '@sb/events', '@sb/db', '@sb/telemetry', '@sb/config', '@sb/schemas'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './src'),
      '@sb/storage': path.resolve(__dirname, '../../packages/storage/src/index.ts'),
      '@sb/cache': path.resolve(__dirname, '../../packages/cache/src/index.ts'),
      '@sb/ai': path.resolve(__dirname, '../../packages/ai/src/index.ts'),
      '@sb/events': path.resolve(__dirname, '../../packages/events/src/index.ts'),
      '@sb/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@sb/telemetry': path.resolve(__dirname, '../../packages/telemetry/src/index.ts'),
      '@sb/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@sb/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
    },
  },
})
