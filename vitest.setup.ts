import { expect, afterEach, vi } from 'vitest';

/**
 * Global vitest setup file
 * Runs before all tests
 */

// Mock environment variables for testing
process.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key-12345';

// Extend matchers with custom matchers if needed
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },
});

// Global cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Suppress console errors/warnings in tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn((...args) => {
    // Allow specific error patterns for testing
    const message = args[0]?.toString?.() || '';
    if (
      message.includes('Error') ||
      message.includes('Failed') ||
      message.includes('Invalid')
    ) {
      // These are expected errors in tests
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = vi.fn((...args) => {
    const message = args[0]?.toString?.() || '';
    if (message.includes('Warning') || message.includes('deprecated')) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
