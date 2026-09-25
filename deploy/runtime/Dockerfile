FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS dependencies
WORKDIR /opt/quizmon
COPY deploy/runtime/package.json deploy/runtime/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
WORKDIR /opt/quizmon
COPY --from=dependencies /opt/quizmon/node_modules ./node_modules
COPY deploy/migrate-release.ts deploy/migration-runner.ts deploy/release-lock.ts deploy/release-inputs.ts deploy/publication.ts deploy/rebuild-round-score.ts ./deploy/
COPY deploy/powersync/sync-config.yaml ./deploy/powersync/
COPY src/lib/validation.ts src/lib/random.ts ./src/lib/
COPY src/domain ./src/domain
COPY server/migrations ./server/migrations
RUN node --input-type=module -e "try { await import('./deploy/migrate-release.ts') } catch (error) { if (error.message !== 'Usage: migrate-release.ts <migration-connection.json>') throw error }"
USER node
ENTRYPOINT ["node", "deploy/migrate-release.ts"]
