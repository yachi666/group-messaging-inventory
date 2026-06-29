import { maskTemplateContent } from '@gmi/policy';
import { readFile } from 'node:fs/promises';

const fixtures = JSON.parse(
  await readFile('packages/policy/fixtures/pii-masking-fixtures.json', 'utf8'),
);

for (const fixture of fixtures) {
  const masked = maskTemplateContent(fixture.content);

  assertEqual(masked.passed, true, `${fixture.id} masking pass flag`);

  for (const expected of fixture.expectedIncludes) {
    assertIncludes(masked.maskedContent, expected, `${fixture.id} include ${expected}`);
  }

  for (const forbidden of fixture.expectedExcludes) {
    assertDoesNotInclude(masked.maskedContent, forbidden, `${fixture.id} exclude ${forbidden}`);
  }
}

const rawContent = fixtures[0].content;

const activities = await import('../apps/worker/dist/workflows/activities.js');
const output = await activities.runTemplateAnalysisActivity({
  templateUuid: 'tpl-pii-mask-smoke',
  versionId: 'tv-pii-mask-smoke-v1',
  effort: 'normal',
  rawContent,
});

assertDoesNotInclude(output.extractedPattern, 'Jane Doe', 'worker raw name');
assertDoesNotInclude(output.extractedPattern, 'jane.doe@example.com', 'worker raw email');
assertDoesNotInclude(output.extractedPattern, '+1 415-555-0134', 'worker raw phone');
assertDoesNotInclude(output.extractedPattern, '123456789012', 'worker raw account');
assertIncludes(output.extractedPattern, '{{email}}', 'worker masked email');

console.log('PII masking local smoke passed.');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to include ${expected}`);
  }
}

function assertDoesNotInclude(value, forbidden, label) {
  if (value.includes(forbidden)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} not to include ${forbidden}`);
  }
}
