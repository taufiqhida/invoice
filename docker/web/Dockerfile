# Tahap 1: build React (Vite) — Node hanya ada di dalam image, bukan di mesin Anda.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Tahap 2: Nginx menyajikan berkas statis dan meneruskan /api ke Laravel.
FROM nginx:1.27-alpine
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
