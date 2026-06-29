import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PostgresAnalysisRunRepository } from '@gmi/db';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const apiMain = read('apps/api/src/main.ts');
assertIncludes(apiMain, 'app.enableShutdownHooks()', 'API must enable Nest shutdown hooks');

const postgresRepository = read('packages/db/src/postgres.ts');
assertIncludes(
  postgresRepository,
  'async onModuleDestroy()',
  'Postgres repository must expose a Nest lifecycle cleanup hook',
);
assertIncludes(
  postgresRepository,
  'await this.db.destroy()',
  'Postgres repository lifecycle hook must destroy Kysely',
);

const workerMain = read('apps/worker/src/main.ts');
for (const expected of [
  "process.once('SIGINT'",
  "process.once('SIGTERM'",
  'worker.shutdown()',
  'cleanupRuntime()',
  'shutdownAnalysisRunRepository()',
  'connection.close()',
]) {
  assertIncludes(workerMain, expected, `Worker runtime must include ${expected}`);
}

const workerActivities = read('apps/worker/src/workflows/activities.ts');
for (const expected of [
  'repositoryShutdown',
  'postgresRepository.onModuleDestroy()',
  'export async function shutdownAnalysisRunRepository()',
]) {
  assertIncludes(workerActivities, expected, `Worker activities must include ${expected}`);
}

let destroyed = false;
const repository = new PostgresAnalysisRunRepository({
  destroy: async () => {
    destroyed = true;
  },
});
await repository.onModuleDestroy();

if (!destroyed) {
  throw new Error('PostgresAnalysisRunRepository.onModuleDestroy did not destroy the database.');
}

console.log('Runtime lifecycle local smoke passed.');

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected source to include ${expected}`);
  }
}
