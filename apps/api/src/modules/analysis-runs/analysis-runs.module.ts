import { Module } from '@nestjs/common';
import {
  createPostgresDatabase,
  createPostgresPool,
  InMemoryAnalysisRunRepository,
  PostgresAnalysisRunRepository,
} from '@gmi/db';
import { AnalysisRunsController } from './analysis-runs.controller.js';
import { AnalysisRunsService } from './analysis-runs.service.js';
import {
  analysisRunRepositoryToken,
  analysisWorkflowClientToken,
} from './analysis-runs.tokens.js';
import { createAnalysisWorkflowClientFromEnv } from './analysis-workflow-client.js';

@Module({
  controllers: [AnalysisRunsController],
  providers: [
    AnalysisRunsService,
    {
      provide: analysisRunRepositoryToken,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
          return new InMemoryAnalysisRunRepository();
        }

        const pool = createPostgresPool({ connectionString });
        const db = createPostgresDatabase(pool);

        return new PostgresAnalysisRunRepository(db);
      },
    },
    {
      provide: analysisWorkflowClientToken,
      useFactory: () => createAnalysisWorkflowClientFromEnv(process.env),
    },
  ],
})
export class AnalysisRunsModule {}
