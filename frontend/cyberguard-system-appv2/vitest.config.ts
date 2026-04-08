import { defineConfig } from 'vitest/config';
import path from 'path';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@environments': path.resolve(__dirname, 'src/environments'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/test-setup.ts',
        'src/main.ts',
        'src/environments/**',
        'node_modules/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
