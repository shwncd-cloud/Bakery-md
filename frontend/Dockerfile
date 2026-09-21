# Portable fallback for self-hosting the built PWA behind nginx. The
# primary deploy path is a static host (Cloudflare Pages - see root
# DEPLOYMENT.md) which builds straight from the repo and doesn't need
# this file at all.
# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# VITE_API_BASE_URL is baked in at build time - pass it as a build arg
# when the backend's URL is known.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- runtime ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
