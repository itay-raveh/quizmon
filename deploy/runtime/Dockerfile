FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS dependencies
WORKDIR /opt/quizmon
COPY deploy/runtime/package.json deploy/runtime/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
WORKDIR /opt/quizmon
COPY --from=dependencies /opt/quizmon/node_modules ./node_modules
COPY deploy/migrate-release.ts deploy/migration-runner.ts deploy/release-lock.ts deploy/release-inputs.ts deploy/alpha-write-gate.ts deploy/transfer-alpha-progress.ts ./deploy/
COPY src/lib/validation.ts src/lib/random.ts ./src/lib/
COPY src/lib/storage/rxdb-database.ts src/lib/storage/rxdb-schema.ts ./src/lib/storage/
COPY src/question-rules.ts ./src/
COPY src/domain ./src/domain
COPY server/rxdb-sync.ts server/rxdb-read.ts ./server/
COPY server/migrations ./server/migrations
RUN node --input-type=module -e "await import('./server/rxdb-sync.ts'); for (const [file, usage] of [['migrate-release.ts', 'Usage: migrate-release.ts <migration-connection.json>'], ['transfer-alpha-progress.ts', 'Usage: transfer-alpha-progress.ts <migration-connection.json> [--dry-run|--install-write-gate|--remove-write-gate]']]) { try { await import('./deploy/' + file) } catch (error) { if (error.message !== usage) throw error } }"
USER node
ENTRYPOINT ["node", "deploy/migrate-release.ts"]
