FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.workspace.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build:packages && npm run build:worker

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker ./apps/worker
COPY --from=build /app/packages ./packages

CMD ["npm", "run", "start", "-w", "@gmi/worker"]
