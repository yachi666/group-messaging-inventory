import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const files = [
  '.dockerignore',
  'apps/api/Dockerfile',
  'apps/worker/Dockerfile',
  'apps/web/Dockerfile',
  'apps/web/nginx.conf',
  'docker-compose.yml'
];

for (const file of files) {
  assert(existsSync(resolve(root, file)), `Missing deploy file: ${file}`);
}

const dockerignore = read('.dockerignore');
for (const pattern of ['node_modules', 'apps/*/dist', 'packages/*/dist', '.git', '.env']) {
  assert(dockerignore.includes(pattern), `.dockerignore must include ${pattern}`);
}

const apiDockerfile = read('apps/api/Dockerfile');
for (const expected of [
  'npm run build:packages && npm run build:api',
  'EXPOSE 4000',
  'CMD ["npm", "run", "start", "-w", "@gmi/api"]'
]) {
  assert(apiDockerfile.includes(expected), `API Dockerfile missing ${expected}`);
}

const workerDockerfile = read('apps/worker/Dockerfile');
for (const expected of [
  'FROM node:24-bookworm-slim AS build',
  'FROM node:24-bookworm-slim AS runtime',
  'npm run build:packages && npm run build:worker',
  'CMD ["npm", "run", "start", "-w", "@gmi/worker"]'
]) {
  assert(workerDockerfile.includes(expected), `Worker Dockerfile missing ${expected}`);
}

const webDockerfile = read('apps/web/Dockerfile');
for (const expected of [
  'ARG VITE_API_BASE_URL=http://127.0.0.1:4000',
  'npm run build:packages && npm run build:web',
  'nginx:1.27-alpine',
  'COPY --from=build /app/apps/web/dist /usr/share/nginx/html'
]) {
  assert(webDockerfile.includes(expected), `Web Dockerfile missing ${expected}`);
}

const nginx = read('apps/web/nginx.conf');
for (const expected of ['try_files $uri $uri/ /index.html', 'Cache-Control "public, max-age=31536000, immutable"']) {
  assert(nginx.includes(expected), `nginx config missing ${expected}`);
}

const compose = read('docker-compose.yml');
for (const expected of [
  'gmi-api:',
  'gmi-worker:',
  'gmi-web:',
  'gmi-db-migrate:',
  'profiles:',
  'healthcheck:',
  'dockerfile: apps/api/Dockerfile',
  'dockerfile: apps/worker/Dockerfile',
  'dockerfile: apps/web/Dockerfile',
  'DATABASE_URL: postgres://gmi:gmi@gmi-postgres:5432/gmi',
  "command: ['npm', 'run', 'migrate:prod', '-w', '@gmi/db']",
  'condition: service_completed_successfully',
  'ANALYSIS_WORKFLOW_DRIVER: temporal',
  'TEMPORAL_ADDRESS: temporal:7233',
  'API_AUTH_MODE: header',
  'AI_PROVIDER_READINESS_MODE: config',
  'VITE_API_BASE_URL: http://127.0.0.1:4000',
  "'5080:80'"
]) {
  assert(compose.includes(expected), `docker-compose.yml missing ${expected}`);
}

const packageJson = JSON.parse(read('package.json'));
assert(
  packageJson.scripts?.['test:deploy:compose'] ===
    'node scripts/verify-compose-app-profile-local.mjs',
  'package.json must expose test:deploy:compose.',
);
assert(
  packageJson.scripts?.['test:release-preflight:local']?.includes(
    'npm run test:deploy:compose',
  ),
  'test:release-preflight:local must include test:deploy:compose.',
);

console.log('Deploy configuration verifier passed.');
