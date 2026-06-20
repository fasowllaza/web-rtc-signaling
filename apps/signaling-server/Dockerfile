FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json eslint.config.mjs ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npx nx build signaling-server

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/dist/apps/signaling-server ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "src/main.js"]
