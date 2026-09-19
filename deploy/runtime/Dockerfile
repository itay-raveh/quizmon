FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS dependencies
WORKDIR /opt/quizmon
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
WORKDIR /opt/quizmon
COPY --from=dependencies /opt/quizmon/node_modules ./node_modules
COPY package.json package-lock.json manifest.json ./
COPY assets ./assets
COPY worker ./worker
COPY server ./server
COPY deploy ./deploy
COPY src ./src
USER node
ENV WRANGLER_SEND_METRICS=false
ENTRYPOINT ["node", "deploy/release-command.ts"]
CMD ["verify"]
