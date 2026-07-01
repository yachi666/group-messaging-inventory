import { readFile } from 'node:fs/promises';

const workflowPath = '.github/workflows/ci.yml';
const releasePreflightWorkflowPath = '.github/workflows/release-preflight.yml';
const packageJsonPath = 'package.json';
let workflow;
let releasePreflightWorkflow;
let packageJson;

try {
  workflow = await readFile(workflowPath, 'utf8');
} catch (error) {
  throw new Error(`${workflowPath} is required for CI gate enforcement.`);
}

try {
  releasePreflightWorkflow = await readFile(releasePreflightWorkflowPath, 'utf8');
} catch (error) {
  throw new Error(`${releasePreflightWorkflowPath} is required for release preflight enforcement.`);
}

try {
  packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
} catch (error) {
  throw new Error(`${packageJsonPath} is required for CI gate enforcement.`);
}

const requiredSnippets = [
  'on:',
  'pull_request:',
  'push:',
  'npm ci',
  'npm run test:no-infra',
];

for (const snippet of requiredSnippets) {
  if (!workflow.includes(snippet)) {
    throw new Error(`CI workflow is missing required snippet: ${snippet}`);
  }
}

if (/sk-[A-Za-z0-9]/.test(workflow)) {
  throw new Error('CI workflow must not contain inline API keys.');
}

const requiredReleasePreflightWorkflowSnippets = [
  'workflow_dispatch:',
  'timeout-minutes: 40',
  'npm ci',
  'npm run test:release-preflight:local',
];

for (const snippet of requiredReleasePreflightWorkflowSnippets) {
  if (!releasePreflightWorkflow.includes(snippet)) {
    throw new Error(`Release preflight workflow is missing required snippet: ${snippet}`);
  }
}

if (/sk-[A-Za-z0-9]/.test(releasePreflightWorkflow)) {
  throw new Error('Release preflight workflow must not contain inline API keys.');
}

const noInfraScript = packageJson.scripts?.['test:no-infra'];
const releasePreflightScript = packageJson.scripts?.['test:release-preflight:local'];

if (typeof noInfraScript !== 'string') {
  throw new Error('package.json is missing scripts.test:no-infra.');
}

if (typeof releasePreflightScript !== 'string') {
  throw new Error('package.json is missing scripts.test:release-preflight:local.');
}

const requiredNoInfraCommands = [
  'npm run typecheck',
  'npm run test:secrets',
  'npm run test:backend',
  'npm run test:readiness',
  'npm run test:runtime-config',
  'npm run test:runtime-lifecycle',
  'npm run test:api-surface',
  'npm run test:ai-adapter',
  'npm run test:pii:local',
  'npm run test:evals',
  'npm run test:evals:provider:local',
  'npm run test:evals:release:local',
  'npm run test:release-readiness:local',
  'npm run test:evals:release-persistence:local',
  'npm run test:evals:latest-api-mapping:local',
  'npm run test:web-contracts',
  'npm run test:live-frontend-data',
  'npm run test:ci-workflow',
  'npm run test:deploy-config',
  'npm run build',
  'npm run test:web-bundle',
  'npm run test:ui:local',
];

for (const command of requiredNoInfraCommands) {
  if (!noInfraScript.includes(command)) {
    throw new Error(`test:no-infra is missing required command: ${command}`);
  }
}

const requiredReleasePreflightCommands = [
  'npm run infra:up',
  'npm run db:migrate',
  'npm run db:smoke',
  'npm run test:seed-verification-api:pg',
  'npm run test:evals:pg',
  'npm run test:evals:release-persistence:pg',
  'npm run test:evals:release-api:pg',
  'npm run test:harness:temporal',
  'npm run test:harness:temporal:provider-failure',
  'npm run test:deploy:compose',
];

for (const command of requiredReleasePreflightCommands) {
  if (!releasePreflightScript.includes(command)) {
    throw new Error(`test:release-preflight:local is missing required command: ${command}`);
  }
}

console.log('CI workflow local smoke passed.');
