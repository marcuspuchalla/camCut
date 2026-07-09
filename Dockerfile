# Baby Cam Cut — multi-stage build.
# Stage 1 builds the static app; stage 2 runs the tiny signaling+static server.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
ENV PORT=5188
EXPOSE 5188
CMD ["node", "server/index.js"]
