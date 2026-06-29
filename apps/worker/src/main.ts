import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './workflows/activities.js';
import { shutdownAnalysisRunRepository } from './workflows/activities.js';

const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? 'template-analysis';
const address = process.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233';

const connection = await NativeConnection.connect({ address });

const worker = await Worker.create({
  connection,
  namespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
  taskQueue,
  workflowsPath: new URL('./workflows/index.js', import.meta.url).pathname,
  activities,
});

console.log(`Template Analysis worker listening on task queue "${taskQueue}"`);

let shutdownStarted = false;
let runtimeCleanupStarted = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  console.log(`Template Analysis worker received ${signal}; shutting down.`);

  try {
    worker.shutdown();
    await cleanupRuntime();
  } catch (error) {
    console.error('Template Analysis worker shutdown failed.', error);
    process.exitCode = 1;
  }
}

async function cleanupRuntime() {
  if (runtimeCleanupStarted) {
    return;
  }

  runtimeCleanupStarted = true;
  await shutdownAnalysisRunRepository();
  await connection.close();
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

await worker.run();
await cleanupRuntime();
