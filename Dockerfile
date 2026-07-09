# Baby Cam Cut — multi-stage build (Bun).
# Stage 1 builds the static Vue app; stage 2 runs the tiny signaling+static server.
# Debian-based bun image (glibc) is used so native build deps (lightningcss /
# esbuild) resolve reliably during `vite build`.

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
COPY server ./server
ENV PORT=5188
EXPOSE 5188
CMD ["bun", "server/index.js"]
