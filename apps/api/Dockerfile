FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.workspace.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build:packages && npm run build:api

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@gmi/api"]
