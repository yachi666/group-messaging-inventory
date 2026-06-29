import { Controller, Get, Inject } from '@nestjs/common';
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
}
