FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS dependencies
WORKDIR /opt/quizmon
COPY deploy/runtime/package.json deploy/runtime/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
WORKDIR /opt/quizmon
COPY --from=dependencies /opt/quizmon/node_modules ./node_modules
COPY deploy/migrate-release.ts deploy/migration-runner.ts deploy/release-lock.ts deploy/release-inputs.ts ./deploy/
COPY src/lib/validation.ts src/lib/random.ts ./src/lib/
COPY src/lib/storage/rxdb-database.ts src/lib/storage/rxdb-schema.ts src/lib/storage/rxdb-migrations.ts ./src/lib/storage/
COPY src/domain ./src/domain
COPY server/instrument.ts server/rxdb-sync.ts server/rxdb-read.ts server/standings.ts server/trainer-summaries.ts server/trainer-summary-writes.ts server/trainer-projection.ts server/trainer-projection-worker.ts ./server/
COPY server/migrations ./server/migrations
RUN node --input-type=module -e "await import('./server/instrument.ts'); await import('./server/rxdb-sync.ts'); await import('./deploy/migration-runner.ts'); const worker = (await import('./server/trainer-projection.ts')).createTrainerProjector(); try { await worker.ready(); await worker.run({ profile: undefined, rounds: [], detail: true }); } finally { await worker.close(); }"
ARG SENTRY_DSN
ARG SENTRY_RELEASE
ENV SENTRY_DSN=$SENTRY_DSN SENTRY_RELEASE=$SENTRY_RELEASE NODE_OPTIONS=--import=./server/instrument.ts
USER node
ENTRYPOINT ["node", "deploy/migrate-release.ts"]
