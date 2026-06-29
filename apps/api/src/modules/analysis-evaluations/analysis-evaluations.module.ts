import { Module } from '@nestjs/common';
import { AnalysisEvaluationsController } from './analysis-evaluations.controller.js';
import { AnalysisEvaluationsService } from './analysis-evaluations.service.js';

@Module({
  controllers: [AnalysisEvaluationsController],
  providers: [AnalysisEvaluationsService],
})
export class AnalysisEvaluationsModule {}
