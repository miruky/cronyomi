import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.CRONYOMI_BASE ?? '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
