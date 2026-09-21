import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { z } from 'zod';
import { releaseConfigSchema } from '../deploy/release-config.ts';

const path = new URL('../charts/quizmon/values.schema.json', import.meta.url);
const source = readFileSync(path, 'utf8');
const chart = JSON.parse(source) as {
  properties: Record<string, unknown>;
};
const runtime = z.toJSONSchema(releaseConfigSchema, {
  target: 'draft-07',
}) as Record<string, unknown>;
delete runtime.$schema;

const fields = runtime.properties as Record<string, Record<string, unknown>>;
const sync = fields.sync!.properties as Record<string, Record<string, unknown>>;
for (const field of [fields.origin!, sync.endpoint!]) {
  delete field.minLength;
  field.pattern = '^https://[^/@?#:]+(?:[.][^/@?#:]+)+$';
}

export const checkReleaseConfigSchema = () => {
  if (
    JSON.stringify(chart.properties.runtimeConfig) !== JSON.stringify(runtime)
  )
    throw new Error(
      'Helm runtimeConfig schema is stale. Run npm run generate:release-schema.',
    );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) checkReleaseConfigSchema();
  else {
    chart.properties.runtimeConfig = runtime;
    writeFileSync(
      path,
      await prettier.format(JSON.stringify(chart), {
        filepath: fileURLToPath(path),
      }),
    );
  }
}
