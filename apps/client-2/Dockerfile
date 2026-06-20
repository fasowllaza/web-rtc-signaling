FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_SIGNALING_SERVER_URL=http://localhost:8080
ENV VITE_SIGNALING_SERVER_URL=$VITE_SIGNALING_SERVER_URL

COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json eslint.config.mjs ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npx nx build client-2

FROM nginx:1.27-alpine AS runner

COPY apps/client-2/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/apps/client-2 /usr/share/nginx/html

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
