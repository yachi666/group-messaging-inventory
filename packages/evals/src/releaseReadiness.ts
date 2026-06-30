import { latestAnalysisEvaluationResponseSchema } from '@gmi/contracts';
import type { LatestAnalysisEvaluationResponse } from '@gmi/contracts';

export type ReleaseReadinessOptions = {
  requirePersistedEvidence?: boolean;
  expectedPipelineVersion?: string;
  expectedPromptVersion?: string;
  expectedModelProvider?: string;
  expectedModelName?: string;
  expectedRulesetVersion?: string;
  expectedDatasetVersion?: string;
  minCaseCount?: number;
};

export type ReleaseReadinessResult = {
  ready: boolean;
  failures: string[];
  summary: {
    releaseId: string;
    status: LatestAnalysisEvaluationResponse['release']['status'];
    promotionAllowed: boolean;
    evidenceHash: string;
    sourceKind: LatestAnalysisEvaluationResponse['source']['kind'];
    persisted: boolean;
    verdict: LatestAnalysisEvaluationResponse['evaluation']['verdict'];
    datasetVersion: string;
    pipelineVersion: string;
    promptVersion: string;
    modelProvider: string;
    modelName: string;
    rulesetVersion: string;
    caseCount: number;
  };
};

export function evaluateReleaseReadiness(
  response: unknown,
  options: ReleaseReadinessOptions = {},
): ReleaseReadinessResult {
  const latest = latestAnalysisEvaluationResponseSchema.parse(response);
  const failures: string[] = [];
  const thresholdFailures = compareMetricsToThresholds(latest);

  if (options.requirePersistedEvidence && !latest.source.persisted) {
    failures.push('release evidence must be persisted');
  }

  if (latest.evaluation.verdict !== 'pass') {
    failures.push(`evaluation verdict must be pass, got ${latest.evaluation.verdict}`);
  }

  if (latest.release.status !== 'ReadyForPromotion') {
    failures.push(`release status must be ReadyForPromotion, got ${latest.release.status}`);
  }

  if (!latest.release.promotionAllowed) {
    failures.push('release promotionAllowed must be true');
  }

  if (!/^sha256:[a-f0-9]{64}$/.test(latest.release.evidenceHash)) {
    failures.push('release evidenceHash must be a sha256 digest');
  }

  if (latest.evaluation.failedCaseIds.length > 0) {
    failures.push(`evaluation has failed cases: ${latest.evaluation.failedCaseIds.join(', ')}`);
  }

  if (thresholdFailures.length > 0) {
    failures.push(...thresholdFailures);
  }

  if (
    options.minCaseCount !== undefined &&
    latest.evaluation.metrics.caseCount < options.minCaseCount
  ) {
    failures.push(
      `caseCount must be at least ${options.minCaseCount}, got ${latest.evaluation.metrics.caseCount}`,
    );
  }

  assertExpected(
    failures,
    'pipelineVersion',
    latest.release.pipeline.pipelineVersion,
    options.expectedPipelineVersion,
  );
  assertExpected(
    failures,
    'promptVersion',
    latest.release.pipeline.promptVersion,
    options.expectedPromptVersion,
  );
  assertExpected(
    failures,
    'modelProvider',
    latest.release.pipeline.modelProvider,
    options.expectedModelProvider,
  );
  assertExpected(
    failures,
    'modelName',
    latest.release.pipeline.modelName,
    options.expectedModelName,
  );
  assertExpected(
    failures,
    'rulesetVersion',
    latest.release.pipeline.rulesetVersion,
    options.expectedRulesetVersion,
  );
  assertExpected(
    failures,
    'datasetVersion',
    latest.evaluation.datasetVersion,
    options.expectedDatasetVersion,
  );

  return {
    ready: failures.length === 0,
    failures,
    summary: {
      releaseId: latest.release.releaseId,
      status: latest.release.status,
      promotionAllowed: latest.release.promotionAllowed,
      evidenceHash: latest.release.evidenceHash,
      sourceKind: latest.source.kind,
      persisted: latest.source.persisted,
      verdict: latest.evaluation.verdict,
      datasetVersion: latest.evaluation.datasetVersion,
      pipelineVersion: latest.release.pipeline.pipelineVersion,
      promptVersion: latest.release.pipeline.promptVersion,
      modelProvider: latest.release.pipeline.modelProvider,
      modelName: latest.release.pipeline.modelName,
      rulesetVersion: latest.release.pipeline.rulesetVersion,
      caseCount: latest.evaluation.metrics.caseCount,
    },
  };
}

function compareMetricsToThresholds(latest: LatestAnalysisEvaluationResponse) {
  const failures: string[] = [];
  const { metrics, thresholds } = latest.evaluation;

  if (metrics.caseCount < thresholds.minCaseCount) {
    failures.push(`caseCount below threshold: ${metrics.caseCount} < ${thresholds.minCaseCount}`);
  }
  if (metrics.schemaPassRate < thresholds.minSchemaPassRate) {
    failures.push(
      `schemaPassRate below threshold: ${metrics.schemaPassRate} < ${thresholds.minSchemaPassRate}`,
    );
  }
  if (metrics.classificationAccuracy < thresholds.minClassificationAccuracy) {
    failures.push(
      `classificationAccuracy below threshold: ${metrics.classificationAccuracy} < ${thresholds.minClassificationAccuracy}`,
    );
  }
  if (metrics.routingAccuracy < thresholds.minRoutingAccuracy) {
    failures.push(
      `routingAccuracy below threshold: ${metrics.routingAccuracy} < ${thresholds.minRoutingAccuracy}`,
    );
  }
  if (metrics.placeholderRecall < thresholds.minPlaceholderRecall) {
    failures.push(
      `placeholderRecall below threshold: ${metrics.placeholderRecall} < ${thresholds.minPlaceholderRecall}`,
    );
  }

  return failures;
}

function assertExpected(
  failures: string[],
  field: string,
  actual: string,
  expected: string | undefined,
) {
  if (expected !== undefined && actual !== expected) {
    failures.push(`${field} must be ${expected}, got ${actual}`);
  }
}
