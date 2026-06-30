import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { aiMessageTypeSchema } from '@gmi/contracts';
import type {
  AnalysisRunResponse,
  AuditEventsResponse,
  AiTemplateAnalysisResultResponse,
  AiTemplateAnalysisResultsResponse,
  ChangeRequestResponse,
  ChangeRequestEvidencePackage,
  ChangeRequestsResponse,
  ConfirmAnalysisRunResponse,
  CreateCurrentVersionChangeRequestRequest,
  CreateLifecycleChangeRequestRequest,
  CreateMappingChangeRequestRequest,
  DecideChangeRequestRequest,
  ListAuditEventsQuery,
  ListChangeRequestsQuery,
  ListReviewTasksQuery,
  ReviewTasksResponse,
  ReviewTaskResponse,
  SubmitChangeRequestRequest,
  SubmitAnalysisRunRequest,
  TransitionReviewTaskRequest,
} from '@gmi/contracts';
import type { AiTemplateAnalysisOutput } from '@gmi/domain';
import type { AnalysisRunRepository } from '@gmi/db';
import { evaluateAnalysisPolicy } from '@gmi/policy';
import {
  analysisRunRepositoryToken,
  analysisWorkflowClientToken,
} from './analysis-runs.tokens.js';
import type { AnalysisWorkflowClient } from './analysis-workflow-client.js';

type SubmitRunCommand = {
  versionId: string;
  idempotencyKey?: string;
  request: SubmitAnalysisRunRequest;
};

type CreateMappingChangeRequestCommand = {
  templateUuid: string;
  idempotencyKey?: string;
  request: CreateMappingChangeRequestRequest;
};

type CreateLifecycleChangeRequestCommand = {
  templateUuid: string;
  idempotencyKey?: string;
  request: CreateLifecycleChangeRequestRequest;
};

type CreateCurrentVersionChangeRequestCommand = {
  versionId: string;
  idempotencyKey?: string;
  request: CreateCurrentVersionChangeRequestRequest;
};

type SubmitChangeRequestCommand = {
  changeRequestId: string;
  request: SubmitChangeRequestRequest;
};

type DecideChangeRequestCommand = {
  changeRequestId: string;
  request: DecideChangeRequestRequest;
};

type TransitionReviewTaskCommand = {
  taskId: string;
  request: TransitionReviewTaskRequest;
};

@Injectable()
export class AnalysisRunsService {
  constructor(
    @Inject(analysisRunRepositoryToken)
    private readonly repository: AnalysisRunRepository,
    @Inject(analysisWorkflowClientToken)
    private readonly workflowClient: AnalysisWorkflowClient,
  ) {}

  async submitRun(command: SubmitRunCommand) {
    const run = await this.repository.enqueueRun({
      versionId: command.versionId,
      triggerType: command.request.triggerType,
      effort: command.request.effort,
      reason: command.request.reason,
      idempotencyKey: command.idempotencyKey,
    });

    const workflow = await this.workflowClient.startAnalysisRun({
      runId: run.runId,
      templateUuid: run.templateUuid,
      versionId: run.versionId,
      effort: command.request.effort,
    });

    return {
      ...run,
      pollUrl: `/analysis-runs/${run.runId}`,
      workflow,
    };
  }

  async getRun(runId: string): Promise<AnalysisRunResponse> {
    const run = await this.repository.getRun(runId);

    if (!run) {
      throw new NotFoundException(`Analysis run ${runId} was not found.`);
    }

    const { output, ...runMetadata } = run;
    const policy = output
      ? evaluateAnalysisPolicy({
          output,
          effort: 'normal',
          piiMaskingPassed: true,
          hasRetiredButLiveTraffic: false,
          hasClassificationConflict: false,
        })
      : null;

    return {
      ...runMetadata,
      ...(output ? { output: toResponseOutput(output) } : {}),
      ...(policy
        ? {
            routing: {
              reviewTaskId: policy.decision === 'review_required' ? 'RT-local' : null,
              changeRequestId: null,
              policyDecision: policy.decision,
            },
          }
        : {}),
    };
  }

  async listAnalysisResults(): Promise<AiTemplateAnalysisResultsResponse> {
    const results = await this.repository.listAnalysisResults();

    return {
      results: results.map((result): AiTemplateAnalysisResultResponse => ({
        ...result,
        aiMessageType: normalizeAiMessageType(result.aiMessageType),
      })),
    };
  }

  async listReviewTasks(query: ListReviewTasksQuery): Promise<ReviewTasksResponse> {
    const reviewTasks = await this.repository.listReviewTasks({
      status: query.status,
      objectType: query.objectType,
      objectId: query.objectId,
      sourceRunId: query.sourceRunId,
      assignedTo: query.assignedTo,
      limit: query.limit,
    });

    return {
      reviewTasks,
    };
  }

  async transitionReviewTask(
    command: TransitionReviewTaskCommand,
  ): Promise<ReviewTaskResponse> {
    return this.repository.transitionReviewTask({
      taskId: command.taskId,
      actorId: command.request.actorId,
      status: command.request.status,
      assignedTo: command.request.assignedTo,
      reason: command.request.reason,
    });
  }

  async confirmRun(runId: string): Promise<ConfirmAnalysisRunResponse> {
    return this.repository.confirmRun(runId);
  }

  async createMappingChangeRequest(
    command: CreateMappingChangeRequestCommand,
  ): Promise<ChangeRequestResponse> {
    const changeRequest = await this.repository.createMappingChangeRequest({
      templateUuid: command.templateUuid,
      baseRevision: command.request.baseRevision,
      sourceRunId: command.request.sourceRunId,
      targetUseCaseId: command.request.targetUseCaseId,
      reason: command.request.reason,
      idempotencyKey: command.idempotencyKey,
    });

    if (!command.request.submitterActorId) {
      return changeRequest;
    }

    return this.repository.submitChangeRequest({
      changeRequestId: changeRequest.changeRequestId,
      actorId: command.request.submitterActorId,
    });
  }

  async createLifecycleChangeRequest(
    command: CreateLifecycleChangeRequestCommand,
  ): Promise<ChangeRequestResponse> {
    const changeRequest = await this.repository.createLifecycleChangeRequest({
      templateUuid: command.templateUuid,
      baseRevision: command.request.baseRevision,
      sourceRunId: command.request.sourceRunId,
      targetLifecycleStatus: command.request.targetLifecycleStatus,
      reason: command.request.reason,
      idempotencyKey: command.idempotencyKey,
    });

    if (!command.request.submitterActorId) {
      return changeRequest;
    }

    return this.repository.submitChangeRequest({
      changeRequestId: changeRequest.changeRequestId,
      actorId: command.request.submitterActorId,
    });
  }

  async createCurrentVersionChangeRequest(
    command: CreateCurrentVersionChangeRequestCommand,
  ): Promise<ChangeRequestResponse> {
    const changeRequest = await this.repository.createCurrentVersionChangeRequest({
      versionId: command.versionId,
      baseRevision: command.request.baseRevision,
      sourceRunId: command.request.sourceRunId,
      reason: command.request.reason,
      idempotencyKey: command.idempotencyKey,
    });

    if (!command.request.submitterActorId) {
      return changeRequest;
    }

    return this.repository.submitChangeRequest({
      changeRequestId: changeRequest.changeRequestId,
      actorId: command.request.submitterActorId,
    });
  }

  async listChangeRequests(query: ListChangeRequestsQuery): Promise<ChangeRequestsResponse> {
    const changeRequests = await this.repository.listChangeRequests({
      status: query.status,
    });

    return {
      changeRequests,
    };
  }

  async listAuditEvents(query: ListAuditEventsQuery): Promise<AuditEventsResponse> {
    const auditEvents = await this.repository.listAuditEvents({
      objectType: query.objectType,
      objectId: query.objectId,
      sourceRunId: query.sourceRunId,
      changeRequestId: query.changeRequestId,
      limit: query.limit,
    });

    return {
      auditEvents,
    };
  }

  async getChangeRequestEvidencePackage(
    changeRequestId: string,
  ): Promise<ChangeRequestEvidencePackage> {
    const evidencePackage = await this.repository.getChangeRequestEvidencePackage(
      changeRequestId,
    );

    if (!evidencePackage) {
      throw new NotFoundException(
        `Change request evidence package ${changeRequestId} was not found.`,
      );
    }

    const { sourceRun, ...packageMetadata } = evidencePackage;
    const { output, ...sourceRunMetadata } = sourceRun;

    return {
      ...packageMetadata,
      sourceRun: {
        ...sourceRunMetadata,
        ...(output ? { output: toResponseOutput(output) } : {}),
      },
    };
  }

  async submitChangeRequest(
    command: SubmitChangeRequestCommand,
  ): Promise<ChangeRequestResponse> {
    return this.repository.submitChangeRequest({
      changeRequestId: command.changeRequestId,
      actorId: command.request.actorId,
    });
  }

  async decideChangeRequest(
    command: DecideChangeRequestCommand,
  ): Promise<ChangeRequestResponse> {
    return this.repository.decideChangeRequest({
      changeRequestId: command.changeRequestId,
      actorId: command.request.actorId,
      decision: command.request.decision,
      reason: command.request.reason,
    });
  }
}

function toResponseOutput(output: AiTemplateAnalysisOutput): AnalysisRunResponse['output'] {
  return {
    extractedPattern: output.extractedPattern,
    placeholders: output.placeholders.map((placeholder) => ({ ...placeholder })),
    aiMessageType: output.aiMessageType,
    governanceClassificationSuggestion: output.governanceClassificationSuggestion,
    overallConfidence: output.overallConfidence,
    qualityScore: output.qualityScore,
    candidateMatches: output.candidateMatches.map((match) => ({ ...match })),
    anomalies: [...output.anomalies],
    businessExplanation: [...output.businessExplanation],
    technicalEvidence: [...output.technicalEvidence],
  };
}

function normalizeAiMessageType(
  value: string,
): AiTemplateAnalysisResultResponse['aiMessageType'] {
  const directParse = aiMessageTypeSchema.safeParse(value);
  if (directParse.success) {
    return directParse.data;
  }

  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized.includes('otp') || normalized.includes('verification')) {
    return 'OTP';
  }
  if (
    normalized.includes('transaction') ||
    normalized.includes('payment') ||
    normalized.includes('statement')
  ) {
    return 'Transaction';
  }
  if (normalized.includes('marketing') || normalized.includes('promotion')) {
    return 'Marketing';
  }
  if (normalized.includes('profile') || normalized.includes('update')) {
    return 'Profile update';
  }
  return 'Alert';
}
