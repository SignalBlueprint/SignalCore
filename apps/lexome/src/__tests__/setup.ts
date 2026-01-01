import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = 'test-api-key'
process.env.GUTENBERG_API_URL = 'https://gutendex.com'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
}
