import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use jsdom for browser-like environment (can test DOM utilities if needed)
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'node_modules/**',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    
    // Include/exclude patterns
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    
    // Reporter configuration
    reporters: ['default', 'json', 'html'],
    
    // Output files
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
