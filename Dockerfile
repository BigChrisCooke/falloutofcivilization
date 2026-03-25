FROM node:22.12.0-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY client/package.json client/package.json
COPY game/package.json game/package.json

RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:22.12.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=10000 \
    CLIENT_DIST_PATH=/app/client/dist \
    GAME_CONTENT_ROOT=/app/game/content

WORKDIR /app/backend

COPY --from=build /app/package.json /app/package-lock.json /app/
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/package.json /app/backend/package.json
COPY --from=build /app/backend/dist /app/backend/dist
COPY --from=build /app/client/package.json /app/client/package.json
COPY --from=build /app/client/dist /app/client/dist
COPY --from=build /app/game/package.json /app/game/package.json
COPY --from=build /app/game/content /app/game/content
COPY --from=build /app/backend/src/db/migrations /app/backend/dist/backend/src/db/migrations
COPY start.sh /app/start.sh

RUN mkdir -p /app/backend/data
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

EXPOSE 10000

CMD ["/app/start.sh"]
