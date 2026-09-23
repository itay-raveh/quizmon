import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/target-schema.ts',
  out: './server/migrations',
});
