import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/**/*.test.ts'], coverage: { include: ['src/core/**'] } }, server: { host: '0.0.0.0' } });
