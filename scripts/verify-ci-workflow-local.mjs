import { readFile } from 'node:fs/promises';

const workflowPath = '.github/workflows/ci.yml';
const packageJsonPath = 'package.json';
let workflow;
let packageJson;

try {
  workflow = await readFile(workflowPath, 'utf8');
} catch (error) {
  throw new Error(`${workflowPath} is required for CI gate enforcement.`);
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

const noInfraScript = packageJson.scripts?.['test:no-infra'];

if (typeof noInfraScript !== 'string') {
  throw new Error('package.json is missing scripts.test:no-infra.');
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
  'npm run test:evals:release-persistence:local',
  'npm run test:evals:latest-api-mapping:local',
  'npm run test:web-contracts',
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

console.log('CI workflow local smoke passed.');
