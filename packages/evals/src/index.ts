import { ReplayAnalysisAdapter, type AiAnalysisAdapter } from '@gmi/ai-adapters';
import { aiTemplateAnalysisOutputSchema } from '@gmi/contracts';
import { createHash } from 'node:crypto';
import type {
  AiTemplateAnalysisOutput,
  AnalysisEffort,
  GovernanceClassification,
} from '@gmi/domain';
import { evaluateAnalysisPolicy, type PolicyDecision } from '@gmi/policy';

export { verificationSeedCases, type VerificationSeedCase } from './verificationSeedCases.js';

export type GoldenTemplateCase = {
  id: string;
  templateUuid: string;
  versionId: string;
  maskedContent: string;
  effort: AnalysisEffort;
  replayOutput: AiTemplateAnalysisOutput;
  policyContext?: {
    piiMaskingPassed?: boolean;
    hasRetiredButLiveTraffic?: boolean;
    hasClassificationConflict?: boolean;
  };
  expected: {
    classification: GovernanceClassification;
    policyDecision: PolicyDecision;
    placeholderTokens: ReadonlyArray<string>;
  };
};

export type EvaluationThresholds = {
  minCaseCount: number;
  minSchemaPassRate: number;
  minClassificationAccuracy: number;
  minRoutingAccuracy: number;
  minPlaceholderRecall: number;
};

export type EvaluationMode = 'replay' | 'provider';

export type RunGoldenTemplateEvaluationOptions = {
  cases?: ReadonlyArray<GoldenTemplateCase>;
  thresholds?: EvaluationThresholds;
  adapter?: AiAnalysisAdapter;
  mode?: EvaluationMode;
};

export type EvaluationCaseResult = {
  id: string;
  schemaPassed: boolean;
  classificationMatched: boolean;
  routingMatched: boolean;
  placeholderRecall: number;
  failures: string[];
};

export type EvaluationReport = {
  suite: string;
  datasetVersion: string;
  mode: EvaluationMode;
  thresholds: EvaluationThresholds;
  metrics: {
    caseCount: number;
    schemaPassRate: number;
    classificationAccuracy: number;
    routingAccuracy: number;
    placeholderRecall: number;
  };
  verdict: 'pass' | 'fail';
  cases: EvaluationCaseResult[];
};

export type CreatePipelineReleaseEvidenceOptions = {
  releaseId: string;
  pipelineVersion: string;
  promptVersion: string;
  modelProvider: string;
  modelName: string;
  rulesetVersion: string;
  requestedBy: string;
  createdAt?: string;
};

export type PipelineReleaseEvidence = {
  releaseId: string;
  status: 'ReadyForPromotion' | 'BlockedByEvaluation';
  promotionAllowed: boolean;
  evidenceHash: string;
  requestedBy: string;
  createdAt: string;
  pipeline: {
    pipelineVersion: string;
    promptVersion: string;
    modelProvider: string;
    modelName: string;
    rulesetVersion: string;
  };
  evaluation: {
    suite: string;
    datasetVersion: string;
    mode: EvaluationMode;
    verdict: EvaluationReport['verdict'];
    metrics: EvaluationReport['metrics'];
    thresholds: EvaluationReport['thresholds'];
    failureCaseIds: string[];
  };
};

export const defaultEvaluationThresholds: EvaluationThresholds = {
  minCaseCount: 6,
  minSchemaPassRate: 1,
  minClassificationAccuracy: 1,
  minRoutingAccuracy: 1,
  minPlaceholderRecall: 1,
};

export const goldenTemplateCases: GoldenTemplateCase[] = [
  {
    id: 'golden-payment-reminder',
    templateUuid: 'tpl-golden-payment',
    versionId: 'tv-golden-payment-v1',
    maskedContent: 'Your payment of {{amount}} is due on {{due_date}}.',
    effort: 'normal',
    replayOutput: {
      extractedPattern: 'Your payment of {amount} is due on {due_date}.',
      placeholders: [
        {
          token: '{amount}',
          type: 'currency',
          confidence: 96,
        },
        {
          token: '{due_date}',
          type: 'date',
          confidence: 94,
        },
      ],
      aiMessageType: 'Transaction',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 94,
      qualityScore: 91,
      candidateMatches: [
        {
          useCaseId: 'UC-PAYMENT-REMINDER',
          name: 'Payment reminder',
          similarity: 96,
          reason: 'Payment amount and due date match the approved servicing reminder pattern.',
        },
      ],
      anomalies: [],
      businessExplanation: [
        'The message supports an existing customer repayment obligation.',
      ],
      technicalEvidence: ['Detected amount and due date placeholders.'],
    },
    expected: {
      classification: 'Servicing',
      policyDecision: 'auto_record',
      placeholderTokens: ['{amount}', '{due_date}'],
    },
  },
  {
    id: 'golden-otp-low-confidence',
    templateUuid: 'tpl-golden-otp',
    versionId: 'tv-golden-otp-v1',
    maskedContent: 'Use {{otp}} to continue.',
    effort: 'normal',
    replayOutput: {
      extractedPattern: 'Use {otp} to continue.',
      placeholders: [
        {
          token: '{otp}',
          type: 'otp',
          confidence: 98,
        },
      ],
      aiMessageType: 'Authentication',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 84,
      qualityScore: 80,
      candidateMatches: [],
      anomalies: ['no_candidate_match'],
      businessExplanation: [
        'The message appears operational but lacks approved use-case context.',
      ],
      technicalEvidence: ['Detected OTP placeholder.'],
    },
    expected: {
      classification: 'Servicing',
      policyDecision: 'review_required',
      placeholderTokens: ['{otp}'],
    },
  },
  {
    id: 'golden-marketing-promotion',
    templateUuid: 'tpl-golden-marketing-promo',
    versionId: 'tv-golden-marketing-promo-v1',
    maskedContent: 'Save {{discount}} on your next order before {{expiry_date}}.',
    effort: 'normal',
    replayOutput: {
      extractedPattern: 'Save {discount} on your next order before {expiry_date}.',
      placeholders: [
        {
          token: '{discount}',
          type: 'unknown',
          confidence: 90,
        },
        {
          token: '{expiry_date}',
          type: 'date',
          confidence: 93,
        },
      ],
      aiMessageType: 'Promotion',
      governanceClassificationSuggestion: 'Marketing',
      overallConfidence: 94,
      qualityScore: 92,
      candidateMatches: [
        {
          useCaseId: 'UC-PROMOTIONAL-OFFER',
          name: 'Promotional offer',
          similarity: 95,
          reason: 'Discount and expiry date match the approved marketing offer pattern.',
        },
      ],
      anomalies: [],
      businessExplanation: ['The message promotes a time-bound customer offer.'],
      technicalEvidence: ['Detected discount and expiry date placeholders.'],
    },
    expected: {
      classification: 'Marketing',
      policyDecision: 'auto_record',
      placeholderTokens: ['{discount}', '{expiry_date}'],
    },
  },
  {
    id: 'golden-regulatory-disclosure',
    templateUuid: 'tpl-golden-regulatory-disclosure',
    versionId: 'tv-golden-regulatory-disclosure-v1',
    maskedContent: 'Important notice: your rate changes to {{rate}} on {{effective_date}}.',
    effort: 'enhanced_review',
    replayOutput: {
      extractedPattern: 'Important notice: your rate changes to {rate} on {effective_date}.',
      placeholders: [
        {
          token: '{rate}',
          type: 'unknown',
          confidence: 91,
        },
        {
          token: '{effective_date}',
          type: 'date',
          confidence: 95,
        },
      ],
      aiMessageType: 'Disclosure',
      governanceClassificationSuggestion: 'Regulatory',
      overallConfidence: 93,
      qualityScore: 92,
      candidateMatches: [
        {
          useCaseId: 'UC-RATE-CHANGE-DISCLOSURE',
          name: 'Rate change disclosure',
          similarity: 94,
          reason: 'The rate and effective date match the approved regulatory disclosure use case.',
        },
      ],
      anomalies: [],
      businessExplanation: ['The message communicates a regulated rate change.'],
      technicalEvidence: ['Detected rate and effective date placeholders.'],
    },
    expected: {
      classification: 'Regulatory',
      policyDecision: 'review_required',
      placeholderTokens: ['{rate}', '{effective_date}'],
    },
  },
  {
    id: 'golden-candidate-version-drift',
    templateUuid: 'tpl-golden-candidate-drift',
    versionId: 'tv-golden-candidate-drift-v2',
    maskedContent: 'Your plan will renew on {{renewal_date}} with benefits {{benefit_code}}.',
    effort: 'normal',
    replayOutput: {
      extractedPattern:
        'Your plan will renew on {renewal_date} with benefits {benefit_code}.',
      placeholders: [
        {
          token: '{renewal_date}',
          type: 'date',
          confidence: 94,
        },
        {
          token: '{benefit_code}',
          type: 'unknown',
          confidence: 72,
        },
      ],
      aiMessageType: 'Renewal',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 82,
      qualityScore: 76,
      candidateMatches: [],
      anomalies: ['candidate_version_drift', 'no_candidate_match'],
      businessExplanation: [
        'The template appears related to renewals but includes an unfamiliar benefit placeholder.',
      ],
      technicalEvidence: ['Detected renewal date and low-confidence benefit code placeholders.'],
    },
    expected: {
      classification: 'Servicing',
      policyDecision: 'review_required',
      placeholderTokens: ['{renewal_date}', '{benefit_code}'],
    },
  },
  {
    id: 'golden-pii-masking-block',
    templateUuid: 'tpl-golden-pii-block',
    versionId: 'tv-golden-pii-block-v1',
    maskedContent: 'Hi {{name}}, account {{account}} needs attention.',
    effort: 'normal',
    replayOutput: {
      extractedPattern: 'Hi {name}, account {account} needs attention.',
      placeholders: [
        {
          token: '{name}',
          type: 'name',
          confidence: 96,
        },
        {
          token: '{account}',
          type: 'account',
          confidence: 96,
        },
      ],
      aiMessageType: 'Account servicing',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 96,
      qualityScore: 94,
      candidateMatches: [
        {
          useCaseId: 'UC-ACCOUNT-SERVICING',
          name: 'Account servicing',
          similarity: 96,
          reason: 'The template matches an account servicing notification.',
        },
      ],
      anomalies: ['pii_masking_failed'],
      businessExplanation: ['The message may contain sensitive account context.'],
      technicalEvidence: ['PII masking gate failed before provider promotion.'],
    },
    policyContext: {
      piiMaskingPassed: false,
    },
    expected: {
      classification: 'Servicing',
      policyDecision: 'blocked',
      placeholderTokens: ['{name}', '{account}'],
    },
  },
  {
    id: 'golden-classification-conflict',
    templateUuid: 'tpl-golden-classification-conflict',
    versionId: 'tv-golden-classification-conflict-v1',
    maskedContent: 'Confirm consent for {{program_name}} by {{deadline}}.',
    effort: 'normal',
    replayOutput: {
      extractedPattern: 'Confirm consent for {program_name} by {deadline}.',
      placeholders: [
        {
          token: '{program_name}',
          type: 'unknown',
          confidence: 88,
        },
        {
          token: '{deadline}',
          type: 'date',
          confidence: 94,
        },
      ],
      aiMessageType: 'Consent',
      governanceClassificationSuggestion: 'Regulatory',
      overallConfidence: 93,
      qualityScore: 90,
      candidateMatches: [
        {
          useCaseId: 'UC-CONSENT-CAPTURE',
          name: 'Consent capture',
          similarity: 92,
          reason: 'The template asks for consent by a deadline.',
        },
      ],
      anomalies: ['deterministic_ai_classification_conflict'],
      businessExplanation: [
        'The AI classification conflicts with deterministic rules and should be reviewed.',
      ],
      technicalEvidence: ['Deterministic rule marked this as Marketing while AI suggested Regulatory.'],
    },
    policyContext: {
      hasClassificationConflict: true,
    },
    expected: {
      classification: 'Regulatory',
      policyDecision: 'review_required',
      placeholderTokens: ['{program_name}', '{deadline}'],
    },
  },
];

export async function runGoldenTemplateEvaluation(
  casesOrOptions: ReadonlyArray<GoldenTemplateCase> | RunGoldenTemplateEvaluationOptions =
    goldenTemplateCases,
  legacyThresholds: EvaluationThresholds = defaultEvaluationThresholds,
): Promise<EvaluationReport> {
  let options: RunGoldenTemplateEvaluationOptions;

  if (Array.isArray(casesOrOptions)) {
    options = {
      cases: casesOrOptions as ReadonlyArray<GoldenTemplateCase>,
      thresholds: legacyThresholds,
    };
  } else {
    options = casesOrOptions as RunGoldenTemplateEvaluationOptions;
  }
  const cases = options.cases ?? goldenTemplateCases;
  const thresholds = options.thresholds ?? defaultEvaluationThresholds;
  const mode = options.mode ?? (options.adapter ? 'provider' : 'replay');
  const results = await Promise.all(
    cases.map((testCase) =>
      evaluateCase(testCase, options.adapter ?? new ReplayAnalysisAdapter(testCase.replayOutput)),
    ),
  );
  const caseCount = results.length;
  const schemaPassRate = average(results.map((result) => Number(result.schemaPassed)));
  const classificationAccuracy = average(
    results.map((result) => Number(result.classificationMatched)),
  );
  const routingAccuracy = average(results.map((result) => Number(result.routingMatched)));
  const placeholderRecall = average(results.map((result) => result.placeholderRecall));
  const verdict =
    caseCount >= thresholds.minCaseCount &&
    schemaPassRate >= thresholds.minSchemaPassRate &&
    classificationAccuracy >= thresholds.minClassificationAccuracy &&
    routingAccuracy >= thresholds.minRoutingAccuracy &&
    placeholderRecall >= thresholds.minPlaceholderRecall
      ? 'pass'
      : 'fail';

  return {
    suite: 'template-analysis-golden',
    datasetVersion: 'golden-template-analysis@2026.06.27',
    mode,
    thresholds,
    metrics: {
      caseCount,
      schemaPassRate,
      classificationAccuracy,
      routingAccuracy,
      placeholderRecall,
    },
    verdict,
    cases: results,
  };
}

export function createPipelineReleaseEvidence(
  report: EvaluationReport,
  options: CreatePipelineReleaseEvidenceOptions,
): PipelineReleaseEvidence {
  const promotionAllowed = report.verdict === 'pass';
  const unsignedEvidence: Omit<PipelineReleaseEvidence, 'evidenceHash'> = {
    releaseId: options.releaseId,
    status: promotionAllowed ? 'ReadyForPromotion' : 'BlockedByEvaluation',
    promotionAllowed,
    createdAt: options.createdAt ?? new Date().toISOString(),
    requestedBy: options.requestedBy,
    pipeline: {
      pipelineVersion: options.pipelineVersion,
      promptVersion: options.promptVersion,
      modelProvider: options.modelProvider,
      modelName: options.modelName,
      rulesetVersion: options.rulesetVersion,
    },
    evaluation: {
      suite: report.suite,
      datasetVersion: report.datasetVersion,
      mode: report.mode,
      verdict: report.verdict,
      metrics: report.metrics,
      thresholds: report.thresholds,
      failureCaseIds: report.cases
        .filter((testCase) => testCase.failures.length > 0)
        .map((testCase) => testCase.id),
    },
  };

  return {
    ...unsignedEvidence,
    evidenceHash: computePipelineReleaseEvidenceHash(unsignedEvidence),
  };
}

export function verifyPipelineReleaseEvidence(evidence: PipelineReleaseEvidence) {
  const { evidenceHash, ...unsignedEvidence } = evidence;

  return evidenceHash === computePipelineReleaseEvidenceHash(unsignedEvidence);
}

export function computePipelineReleaseEvidenceHash(
  evidence: Omit<PipelineReleaseEvidence, 'evidenceHash'>,
) {
  return `sha256:${createHash('sha256').update(canonicalJson(evidence)).digest('hex')}`;
}

async function evaluateCase(
  testCase: GoldenTemplateCase,
  adapter: AiAnalysisAdapter,
): Promise<EvaluationCaseResult> {
  const output = await adapter.analyzeTemplate({
    templateUuid: testCase.templateUuid,
    versionId: testCase.versionId,
    maskedContent: testCase.maskedContent,
    approvedContext: [],
    effort: testCase.effort,
  });
  const schemaResult = aiTemplateAnalysisOutputSchema.safeParse(output);
  const routing = evaluateAnalysisPolicy({
    output,
    effort: testCase.effort,
    piiMaskingPassed: testCase.policyContext?.piiMaskingPassed ?? true,
    hasRetiredButLiveTraffic:
      testCase.policyContext?.hasRetiredButLiveTraffic ?? false,
    hasClassificationConflict:
      testCase.policyContext?.hasClassificationConflict ?? false,
  });
  const extractedTokens = new Set(output.placeholders.map((placeholder) => placeholder.token));
  const matchedPlaceholderCount = testCase.expected.placeholderTokens.filter((token) =>
    extractedTokens.has(token),
  ).length;
  const placeholderRecall =
    testCase.expected.placeholderTokens.length === 0
      ? 1
      : matchedPlaceholderCount / testCase.expected.placeholderTokens.length;
  const classificationMatched =
    output.governanceClassificationSuggestion === testCase.expected.classification;
  const routingMatched = routing.decision === testCase.expected.policyDecision;
  const failures = [
    ...(schemaResult.success ? [] : ['schema_validation_failed']),
    ...(classificationMatched ? [] : ['classification_mismatch']),
    ...(routingMatched ? [] : ['routing_mismatch']),
    ...(placeholderRecall === 1 ? [] : ['placeholder_recall_below_1']),
  ];

  return {
    id: testCase.id,
    schemaPassed: schemaResult.success,
    classificationMatched,
    routingMatched,
    placeholderRecall,
    failures,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    );

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
