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
  type CreateCurrentVersionChangeRequestRequest,
  type CreateLifecycleChangeRequestRequest,
  type CreateMappingChangeRequestRequest,
  type DecideChangeRequestRequest,
  type ListAuditEventsQuery,
  type ListChangeRequestsQuery,
  type ListReviewTasksQuery,
  type SubmitAnalysisRunRequest,
  type SubmitChangeRequestRequest,
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
    @Body() body: unknown,
  ) {
    const request = createMappingChangeRequestSchema.parse(
      body,
    ) satisfies CreateMappingChangeRequestRequest;

    return this.analysisRuns.createMappingChangeRequest({
      templateUuid,
      idempotencyKey,
      request,
    });
  }

  @Post('templates/:templateUuid/lifecycle-change-requests')
  @RequiresRoles('change_maker')
  createLifecycleChangeRequest(
    @Param('templateUuid') templateUuid: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const request = createLifecycleChangeRequestSchema.parse(
      body,
    ) satisfies CreateLifecycleChangeRequestRequest;

    return this.analysisRuns.createLifecycleChangeRequest({
      templateUuid,
      idempotencyKey,
      request,
    });
  }

  @Post('template-versions/:versionId/current-version-change-requests')
  @RequiresRoles('change_maker')
  createCurrentVersionChangeRequest(
    @Param('versionId') versionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const request = createCurrentVersionChangeRequestSchema.parse(
      body,
    ) satisfies CreateCurrentVersionChangeRequestRequest;

    return this.analysisRuns.createCurrentVersionChangeRequest({
      versionId,
      idempotencyKey,
      request,
    });
  }

  @Post('change-requests/:changeRequestId/submit')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('change_maker')
  submitChangeRequest(@Param('changeRequestId') changeRequestId: string, @Body() body: unknown) {
    const request = submitChangeRequestSchema.parse(body) satisfies SubmitChangeRequestRequest;

    return this.analysisRuns.submitChangeRequest({
      changeRequestId,
      request,
    });
  }

  @Post('change-requests/:changeRequestId/decision')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('change_checker')
  decideChangeRequest(@Param('changeRequestId') changeRequestId: string, @Body() body: unknown) {
    const request = decideChangeRequestSchema.parse(body) satisfies DecideChangeRequestRequest;

    return this.analysisRuns.decideChangeRequest({
      changeRequestId,
      request,
    });
  }
}
