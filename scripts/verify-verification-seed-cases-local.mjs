import { aiTemplateAnalysisOutputSchema } from '@gmi/contracts';
import { verificationSeedCases } from '@gmi/evals';
import { evaluateAnalysisPolicy } from '@gmi/policy';

const requiredPolicyDecisions = new Set(['auto_record', 'review_required', 'blocked']);
const requiredClassifications = new Set(['Regulatory', 'Servicing', 'Marketing']);
const slugs = new Set();
const policyDecisions = new Set();
const classifications = new Set();
const failures = [];

for (const seedCase of verificationSeedCases) {
  if (slugs.has(seedCase.slug)) {
    failures.push(`${seedCase.slug}: duplicate slug`);
  }
  slugs.add(seedCase.slug);

  const schemaResult = aiTemplateAnalysisOutputSchema.safeParse(seedCase.output);
  if (!schemaResult.success) {
    failures.push(`${seedCase.slug}: invalid analysis output schema`);
  }

  if (
    seedCase.output.governanceClassificationSuggestion !== seedCase.expectedClassification
  ) {
    failures.push(`${seedCase.slug}: expected classification does not match output`);
  }

  const policy = evaluateAnalysisPolicy({
    output: seedCase.output,
    effort: seedCase.effort,
    piiMaskingPassed: seedCase.policyContext?.piiMaskingPassed ?? true,
    hasRetiredButLiveTraffic:
      seedCase.policyContext?.hasRetiredButLiveTraffic ?? false,
    hasClassificationConflict:
      seedCase.policyContext?.hasClassificationConflict ?? false,
  });

  if (policy.decision !== seedCase.expectedPolicyDecision) {
    failures.push(
      `${seedCase.slug}: expected ${seedCase.expectedPolicyDecision} but policy returned ${policy.decision}`,
    );
  }

  if (seedCase.output.placeholders.length === 0) {
    failures.push(`${seedCase.slug}: expected at least one placeholder`);
  }

  if (seedCase.output.businessExplanation.length === 0) {
    failures.push(`${seedCase.slug}: missing business explanation`);
  }

  if (seedCase.output.technicalEvidence.length === 0) {
    failures.push(`${seedCase.slug}: missing technical evidence`);
  }

  policyDecisions.add(seedCase.expectedPolicyDecision);
  classifications.add(seedCase.expectedClassification);
}

for (const decision of requiredPolicyDecisions) {
  if (!policyDecisions.has(decision)) {
    failures.push(`missing policy decision coverage: ${decision}`);
  }
}

for (const classification of requiredClassifications) {
  if (!classifications.has(classification)) {
    failures.push(`missing classification coverage: ${classification}`);
  }
}

if (verificationSeedCases.length < 9) {
  failures.push(`expected at least 9 seed cases, got ${verificationSeedCases.length}`);
}

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        failures,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: 'ok',
        caseCount: verificationSeedCases.length,
        policyDecisions: [...policyDecisions].sort(),
        classifications: [...classifications].sort(),
      },
      null,
      2,
    ),
  );
}
