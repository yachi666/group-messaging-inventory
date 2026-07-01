import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GovernanceAuthGuard } from '../auth/governance-auth.guard.js';
import { AnalysisEvaluationsModule } from './analysis-evaluations/analysis-evaluations.module.js';
import { AnalysisRunsModule } from './analysis-runs/analysis-runs.module.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { MetricsService } from './metrics.service.js';
import { ModelConfigurationModule } from './model-configuration/model-configuration.module.js';

@Module({
  imports: [AnalysisRunsModule, AnalysisEvaluationsModule, ModelConfigurationModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    MetricsService,
    {
      provide: APP_GUARD,
      useClass: GovernanceAuthGuard,
    },
  ],
})
export class AppModule {}
