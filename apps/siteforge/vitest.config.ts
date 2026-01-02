import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        'dist/',
        'public/',
        '*.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@sb': path.resolve(__dirname, '../../packages')
    }
  }
});
