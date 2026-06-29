import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  recordPipelineReleaseEvidenceSchema,
  type RecordPipelineReleaseEvidenceRequest,
} from '@gmi/contracts';
import { RequiresRoles } from '../../auth/governance-auth.guard.js';
import { AnalysisEvaluationsService } from './analysis-evaluations.service.js';

@Controller('analysis-evaluations')
export class AnalysisEvaluationsController {
  constructor(
    @Inject(AnalysisEvaluationsService)
    private readonly analysisEvaluations: AnalysisEvaluationsService,
  ) {}

  @Get('latest')
  @RequiresRoles('analysis_reader', 'analysis_runner', 'auditor')
  getLatestEvaluation() {
    return this.analysisEvaluations.getLatestEvaluation();
  }

  @Post('release-evidence')
  @RequiresRoles('change_checker', 'auditor')
  recordReleaseEvidence(@Body() body: unknown) {
    const request = recordPipelineReleaseEvidenceSchema.parse(
      body,
    ) satisfies RecordPipelineReleaseEvidenceRequest;

    return this.analysisEvaluations.recordReleaseEvidence(request);
  }
}
