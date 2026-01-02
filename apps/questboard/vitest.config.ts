import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        'web/',
        '*.config.ts',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@sb/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@sb/storage': path.resolve(__dirname, '../../packages/storage/src'),
      '@sb/schemas': path.resolve(__dirname, '../../packages/schemas/src'),
      '@sb/events': path.resolve(__dirname, '../../packages/events/src'),
      '@sb/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@sb/assignment': path.resolve(__dirname, '../../packages/assignment/src'),
    },
  },
});
