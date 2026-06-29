FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=http://127.0.0.1:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.workspace.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build:packages && npm run build:web

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
