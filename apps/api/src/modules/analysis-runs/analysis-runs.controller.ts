import {
  BadRequestException,
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
  listAnalysisResultsQuerySchema,
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
  type ListAnalysisResultsQuery,
  type ListChangeRequestsQuery,
  type ListReviewTasksQuery,
  type SubmitAnalysisRunRequest,
  type SubmitChangeRequestRequest,
  type TransitionReviewTaskRequest,
} from '@gmi/contracts';
import { RequiresRoles } from '../../auth/governance-auth.guard.js';
import { internalTenantScopeHeader } from '../../auth/governance-auth-context.js';
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
      idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
      request,
    });
  }

  @Get('analysis-runs/:runId')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  getAnalysisRun(@Param('runId') runId: string) {
    return this.analysisRuns.getRun(runId);
  }

  @Get('analysis-runs/:runId/evidence-package')
  @RequiresRoles('analysis_reader', 'auditor')
  getAnalysisRunEvidencePackage(@Param('runId') runId: string) {
    return this.analysisRuns.getAnalysisRunEvidencePackage(runId);
  }

  @Post('analysis-runs/:runId/confirm')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('analysis_reader', 'analysis_runner')
  confirmAnalysisRun(@Param('runId') runId: string) {
    return this.analysisRuns.confirmRun(runId);
  }

  @Get('templates/analysis-results')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  listAnalysisResults(
    @Query() query: unknown,
    @Headers(internalTenantScopeHeader) tenantScopes: string | undefined,
  ) {
    const request =
      listAnalysisResultsQuerySchema.parse(query) satisfies ListAnalysisResultsQuery;

    return this.analysisRuns.listAnalysisResults(request, {
      tenantScopes: parseScopeHeader(tenantScopes),
    });
  }

  @Get('review-tasks')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  listReviewTasks(
    @Query() query: unknown,
    @Headers(internalTenantScopeHeader) tenantScopes: string | undefined,
  ) {
    const request = listReviewTasksQuerySchema.parse(query) satisfies ListReviewTasksQuery;

    return this.analysisRuns.listReviewTasks(request, {
      tenantScopes: parseScopeHeader(tenantScopes),
    });
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
  listChangeRequests(
    @Query() query: unknown,
    @Headers(internalTenantScopeHeader) tenantScopes: string | undefined,
  ) {
    const request = listChangeRequestsQuerySchema.parse(query) satisfies ListChangeRequestsQuery;

    return this.analysisRuns.listChangeRequests(request, {
      tenantScopes: parseScopeHeader(tenantScopes),
    });
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
      idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
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
      idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
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
      idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
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

function normalizeIdempotencyKey(headerValue: string | undefined) {
  if (headerValue === undefined) {
    return undefined;
  }

  const normalized = headerValue.trim();

  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(normalized)) {
    throw new BadRequestException({
      code: 'invalid_idempotency_key',
      message:
        'Idempotency-Key must be 1-128 characters using letters, numbers, dot, underscore, colon, or hyphen.',
      details: {
        header: 'idempotency-key',
      },
    });
  }

  return normalized;
}

function parseScopeHeader(value: string | undefined) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
