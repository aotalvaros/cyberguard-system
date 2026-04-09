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
    include: ['src/**/integration/**/*.spec.ts'],
  },
});
