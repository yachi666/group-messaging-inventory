import { proxyActivities, rootCause } from '@temporalio/workflow';
import type * as activities from './activities.js';

const {
  runTemplateAnalysisActivity,
  routeAnalysisResultActivity,
  persistAnalysisResultActivity,
  persistAnalysisFailureActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
  },
});

export type AnalyzeTemplateVersionWorkflowInput = {
  runId?: string;
  templateUuid: string;
  versionId: string;
  effort: 'deterministic_only' | 'normal' | 'enhanced_review';
};

export async function analyzeTemplateVersionWorkflow(
  input: AnalyzeTemplateVersionWorkflowInput,
) {
  let output;

  try {
    output = await runTemplateAnalysisActivity(input);
  } catch (error) {
    await persistAnalysisFailureActivity({
      runId: input.runId,
      error: toPersistableWorkflowError(error),
    });

    throw error;
  }

  const routing = await routeAnalysisResultActivity({
    effort: input.effort,
    output,
  });
  const persistence = await persistAnalysisResultActivity({
    runId: input.runId,
    output,
    routing,
  });

  return {
    output,
    routing,
    persistence,
  };
}

function toPersistableWorkflowError(error: unknown) {
  const message = rootCause(error) ?? (error instanceof Error ? error.message : String(error));

  if (message.includes('provider_error:')) {
    return {
      code: 'provider_error' as const,
      message,
      retryable:
        message.includes(':http_408:') ||
        message.includes(':http_429:') ||
        /:http_5\d\d:/.test(message) ||
        message.includes(':network:'),
    };
  }

  if (message.includes('schema')) {
    return {
      code: 'schema_validation_failed' as const,
      message,
      retryable: false,
    };
  }

  return {
    code: 'unknown_error' as const,
    message,
    retryable: false,
  };
}
