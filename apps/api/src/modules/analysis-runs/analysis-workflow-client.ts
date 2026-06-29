import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
} from '@temporalio/client';
import type { AnalysisEffort } from '@gmi/domain';

export type StartAnalysisWorkflowCommand = {
  runId: string;
  templateUuid: string;
  versionId: string;
  effort: AnalysisEffort;
};

export type StartAnalysisWorkflowResult = {
  driver: 'none' | 'temporal';
  workflowId: string | null;
  started: boolean;
};

export type AnalysisWorkflowClient = {
  startAnalysisRun(
    command: StartAnalysisWorkflowCommand,
  ): Promise<StartAnalysisWorkflowResult>;
};

export class NoopAnalysisWorkflowClient implements AnalysisWorkflowClient {
  async startAnalysisRun(): Promise<StartAnalysisWorkflowResult> {
    return {
      driver: 'none',
      workflowId: null,
      started: false,
    };
  }
}

export type TemporalAnalysisWorkflowClientOptions = {
  address: string;
  namespace: string;
  taskQueue: string;
};

export class TemporalAnalysisWorkflowClient implements AnalysisWorkflowClient {
  private readonly clientPromise: Promise<Client>;

  constructor(private readonly options: TemporalAnalysisWorkflowClientOptions) {
    this.clientPromise = this.connect();
  }

  async startAnalysisRun(
    command: StartAnalysisWorkflowCommand,
  ): Promise<StartAnalysisWorkflowResult> {
    const client = await this.clientPromise;
    const workflowId = `template-analysis-${command.runId}`;

    try {
      await client.workflow.start('analyzeTemplateVersionWorkflow', {
        taskQueue: this.options.taskQueue,
        workflowId,
        args: [
          {
            runId: command.runId,
            templateUuid: command.templateUuid,
            versionId: command.versionId,
            effort: command.effort,
          },
        ],
      });

      return {
        driver: 'temporal',
        workflowId,
        started: true,
      };
    } catch (error) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        return {
          driver: 'temporal',
          workflowId,
          started: false,
        };
      }

      throw error;
    }
  }

  private async connect() {
    const connection = await Connection.connect({
      address: this.options.address,
    });

    return new Client({
      connection,
      namespace: this.options.namespace,
    });
  }
}

export function createAnalysisWorkflowClientFromEnv(
  env: Record<string, string | undefined>,
): AnalysisWorkflowClient {
  if (env.ANALYSIS_WORKFLOW_DRIVER === 'temporal') {
    return new TemporalAnalysisWorkflowClient({
      address: env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233',
      namespace: env.TEMPORAL_NAMESPACE ?? 'default',
      taskQueue: env.TEMPORAL_TASK_QUEUE ?? 'template-analysis',
    });
  }

  return new NoopAnalysisWorkflowClient();
}
