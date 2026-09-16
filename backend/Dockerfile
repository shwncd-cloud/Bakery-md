# ---- build ----
FROM node:22-alpine AS build
# Prisma's query engine needs libssl on Alpine (musl) - without it, it
# silently guesses an engine version and can fail at runtime.
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

# Applies any pending migrations before starting - safe to run on every
# deploy, a no-op when the schema is already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
