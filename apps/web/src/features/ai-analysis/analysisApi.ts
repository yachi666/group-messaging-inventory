import {
  aiTemplateAnalysisResultsResponseSchema,
  analysisRunResponseSchema,
  latestAnalysisEvaluationResponseSchema,
  submitAnalysisRunResponseSchema,
  type AnalysisRunResponse,
  type SubmitAnalysisRunResponse,
} from '@gmi/contracts';

import {
  fallbackLatestAnalysisEvaluation,
  initialAnalysisResults,
} from './analysisData';
import type {
  AiTemplateAnalysisResult,
  LatestAnalysisEvaluation,
} from './analysisTypes';
import { apiFetch } from '../../lib/apiClient';

export async function fetchAnalysisResults(
  signal?: AbortSignal,
): Promise<ReadonlyArray<AiTemplateAnalysisResult>> {
  const response = await apiFetch('/templates/analysis-results', {
    roles: ['analysis_reader'],
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load analysis results: ${response.status}`);
  }

  const payload = aiTemplateAnalysisResultsResponseSchema.parse(await response.json());

  return payload.results;
}

export async function fetchLatestAnalysisEvaluation(
  signal?: AbortSignal,
): Promise<LatestAnalysisEvaluation> {
  const response = await apiFetch('/analysis-evaluations/latest', {
    roles: ['analysis_reader'],
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load latest analysis evaluation: ${response.status}`);
  }

  const payload = latestAnalysisEvaluationResponseSchema.parse(await response.json());

  return payload;
}

export async function submitTemplateReanalysisRun(input: {
  versionId: string;
  reason: string;
}): Promise<SubmitAnalysisRunResponse> {
  const response = await apiFetch(
    `/template-versions/${encodeURIComponent(input.versionId)}/analysis-runs`,
    {
      body: JSON.stringify({
        triggerType: 'manual_reanalysis',
        reason: input.reason,
        effort: 'normal',
        requestedOutputs: ['analysis_output', 'policy_routing'],
      }),
      headers: {
        'idempotency-key': `web-reanalysis-${input.versionId}-${Date.now()}`,
      },
      method: 'POST',
      roles: ['analysis_runner'],
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to submit re-analysis run: ${response.status}`);
  }

  return submitAnalysisRunResponseSchema.parse(await response.json());
}

export async function fetchAnalysisRun(runId: string): Promise<AnalysisRunResponse> {
  const response = await apiFetch(`/analysis-runs/${encodeURIComponent(runId)}`, {
    roles: ['analysis_reader'],
  });

  if (!response.ok) {
    throw new Error(`Failed to load analysis run: ${response.status}`);
  }

  return analysisRunResponseSchema.parse(await response.json());
}

export async function confirmAnalysisRun(runId: string): Promise<void> {
  const response = await apiFetch(`/analysis-runs/${encodeURIComponent(runId)}/confirm`, {
    roles: ['analysis_runner'],
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to confirm analysis run: ${response.status}`);
  }
}

export async function createMappingChangeRequest(input: {
  templateUuid: string;
  sourceRunId: string;
  targetUseCaseId: string;
  reason: string;
  submitForApproval?: boolean;
}): Promise<void> {
  const response = await apiFetch(
    `/templates/${encodeURIComponent(input.templateUuid)}/mapping-change-requests`,
    {
      body: JSON.stringify({
        baseRevision: 0,
        sourceRunId: input.sourceRunId,
        targetUseCaseId: input.targetUseCaseId,
        reason: input.reason,
        submitForApproval: input.submitForApproval ?? false,
      }),
      method: 'POST',
      roles: ['change_maker'],
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create mapping change request: ${response.status}`);
  }
}

export async function createLifecycleChangeRequest(input: {
  templateUuid: string;
  sourceRunId: string;
  reason: string;
  submitForApproval?: boolean;
}): Promise<void> {
  const response = await apiFetch(
    `/templates/${encodeURIComponent(input.templateUuid)}/lifecycle-change-requests`,
    {
      body: JSON.stringify({
        baseRevision: 0,
        sourceRunId: input.sourceRunId,
        targetLifecycleStatus: 'Retired',
        reason: input.reason,
        submitForApproval: input.submitForApproval ?? false,
      }),
      method: 'POST',
      roles: ['change_maker'],
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create lifecycle change request: ${response.status}`);
  }
}

export function getFallbackAnalysisResults(): ReadonlyArray<AiTemplateAnalysisResult> {
  return initialAnalysisResults;
}

export function getFallbackLatestAnalysisEvaluation(): LatestAnalysisEvaluation {
  return fallbackLatestAnalysisEvaluation;
}
