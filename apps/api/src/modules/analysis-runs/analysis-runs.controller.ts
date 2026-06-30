import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  createCurrentVersionChangeRequestSchema,
  createLifecycleChangeRequestSchema,
  createMappingChangeRequestSchema,
  decideChangeRequestSchema,
  listAuditEventsQuerySchema,
  listChangeRequestsQuerySchema,
  listReviewTasksQuerySchema,
  submitAnalysisRunSchema,
  submitChangeRequestSchema,
  transitionReviewTaskSchema,
  type CreateCurrentVersionChangeRequestRequest,
  type CreateLifecycleChangeRequestRequest,
  type CreateMappingChangeRequestRequest,
  type DecideChangeRequestRequest,
  type ListAuditEventsQuery,
  type ListChangeRequestsQuery,
  type ListReviewTasksQuery,
  type SubmitAnalysisRunRequest,
  type SubmitChangeRequestRequest,
  type TransitionReviewTaskRequest,
} from '@gmi/contracts';
import { RequiresRoles } from '../../auth/governance-auth.guard.js';
import { AnalysisRunsService } from './analysis-runs.service.js';

@Controller()
export class AnalysisRunsController {
  constructor(
    @Inject(AnalysisRunsService)
    private readonly analysisRuns: AnalysisRunsService,
  ) {}

  @Post('template-versions/:versionId/analysis-runs')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequiresRoles('analysis_runner')
  submitAnalysisRun(
    @Param('versionId') versionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const request = submitAnalysisRunSchema.parse(body) satisfies SubmitAnalysisRunRequest;
    return this.analysisRuns.submitRun({
      versionId,
      idempotencyKey,
      request,
    });
  }

  @Get('analysis-runs/:runId')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  getAnalysisRun(@Param('runId') runId: string) {
    return this.analysisRuns.getRun(runId);
  }

  @Post('analysis-runs/:runId/confirm')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('analysis_reader', 'analysis_runner')
  confirmAnalysisRun(@Param('runId') runId: string) {
    return this.analysisRuns.confirmRun(runId);
  }

  @Get('templates/analysis-results')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  listAnalysisResults() {
    return this.analysisRuns.listAnalysisResults();
  }

  @Get('review-tasks')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  listReviewTasks(@Query() query: unknown) {
    const request = listReviewTasksQuerySchema.parse(query) satisfies ListReviewTasksQuery;

    return this.analysisRuns.listReviewTasks(request);
  }

  @Post('review-tasks/:taskId/transition')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('analysis_runner', 'change_checker')
  transitionReviewTask(
    @Param('taskId') taskId: string,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() body: unknown,
  ) {
    const request = transitionReviewTaskSchema.parse(
      body,
    ) satisfies TransitionReviewTaskRequest;

    return this.analysisRuns.transitionReviewTask({
      taskId,
      request: {
        ...request,
        actorId: resolveCommandActorId(actorId, request.actorId),
      },
    });
  }

  @Get('change-requests')
  @RequiresRoles('change_maker', 'change_checker', 'auditor')
  listChangeRequests(@Query() query: unknown) {
    const request = listChangeRequestsQuerySchema.parse(query) satisfies ListChangeRequestsQuery;

    return this.analysisRuns.listChangeRequests(request);
  }

  @Get('audit-events')
  @RequiresRoles('change_checker', 'auditor')
  listAuditEvents(@Query() query: unknown) {
    const request = listAuditEventsQuerySchema.parse(query) satisfies ListAuditEventsQuery;

    return this.analysisRuns.listAuditEvents(request);
  }

  @Get('change-requests/:changeRequestId/evidence-package')
  @RequiresRoles('change_checker', 'auditor')
  getChangeRequestEvidencePackage(@Param('changeRequestId') changeRequestId: string) {
    return this.analysisRuns.getChangeRequestEvidencePackage(changeRequestId);
  }

  @Post('templates/:templateUuid/mapping-change-requests')
  @RequiresRoles('change_maker')
  createMappingChangeRequest(
    @Param('templateUuid') templateUuid: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() body: unknown,
  ) {
    const request = createMappingChangeRequestSchema.parse(
      body,
    ) satisfies CreateMappingChangeRequestRequest;

    return this.analysisRuns.createMappingChangeRequest({
      templateUuid,
      idempotencyKey,
      request: withSubmitterActor(request, actorId),
    });
  }

  @Post('templates/:templateUuid/lifecycle-change-requests')
  @RequiresRoles('change_maker')
  createLifecycleChangeRequest(
    @Param('templateUuid') templateUuid: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() body: unknown,
  ) {
    const request = createLifecycleChangeRequestSchema.parse(
      body,
    ) satisfies CreateLifecycleChangeRequestRequest;

    return this.analysisRuns.createLifecycleChangeRequest({
      templateUuid,
      idempotencyKey,
      request: withSubmitterActor(request, actorId),
    });
  }

  @Post('template-versions/:versionId/current-version-change-requests')
  @RequiresRoles('change_maker')
  createCurrentVersionChangeRequest(
    @Param('versionId') versionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() body: unknown,
  ) {
    const request = createCurrentVersionChangeRequestSchema.parse(
      body,
    ) satisfies CreateCurrentVersionChangeRequestRequest;

    return this.analysisRuns.createCurrentVersionChangeRequest({
      versionId,
      idempotencyKey,
      request: withSubmitterActor(request, actorId),
    });
  }

  @Post('change-requests/:changeRequestId/submit')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('change_maker')
  submitChangeRequest(
    @Param('changeRequestId') changeRequestId: string,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() body: unknown,
  ) {
    const request = submitChangeRequestSchema.parse(body) satisfies SubmitChangeRequestRequest;

    return this.analysisRuns.submitChangeRequest({
      changeRequestId,
      request: {
        ...request,
        actorId: resolveCommandActorId(actorId, request.actorId),
      },
    });
  }

  @Post('change-requests/:changeRequestId/decision')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('change_checker')
  decideChangeRequest(
    @Param('changeRequestId') changeRequestId: string,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() body: unknown,
  ) {
    const request = decideChangeRequestSchema.parse(body) satisfies DecideChangeRequestRequest;

    return this.analysisRuns.decideChangeRequest({
      changeRequestId,
      request: {
        ...request,
        actorId: resolveCommandActorId(actorId, request.actorId),
      },
    });
  }
}

function resolveCommandActorId(headerActorId: string | undefined, bodyActorId?: string) {
  const normalizedHeaderActorId = headerActorId?.trim();
  return normalizedHeaderActorId || bodyActorId || 'anonymous';
}

function withSubmitterActor<
  T extends
    | CreateMappingChangeRequestRequest
    | CreateLifecycleChangeRequestRequest
    | CreateCurrentVersionChangeRequestRequest,
>(request: T, headerActorId: string | undefined): T {
  if (!request.submitForApproval && !request.submitterActorId) {
    return request;
  }

  return {
    ...request,
    submitterActorId: resolveCommandActorId(headerActorId, request.submitterActorId),
  };
}
