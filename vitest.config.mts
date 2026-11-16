import { defineConfig } from "vitest/config";

// Cada arquivo de teste do banco sobe um PostgreSQL (PGlite) e roda todas as migrations;
// com vários em paralelo isso pode passar dos 10 s padrão do beforeAll.
export default defineConfig({
  test: {
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
