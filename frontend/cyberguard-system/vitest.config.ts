/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    // ⚠️ OPTIMIZACIÓN: Configuración simplificada compatible con Vitest 4
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts'
      ]
    },
    testTimeout: 10000
  }
});