import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './workflows/activities.js';

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

await worker.run();
