import { Inject, Injectable, Optional } from '@nestjs/common';
import { Connection } from '@temporalio/client';
import { createPostgresPool } from '@gmi/db';
import type { ReadinessResponse } from '@gmi/contracts';

type ReadinessComponent = ReadinessResponse['components'][number];

export type HealthServiceOptions = {
  env?: Record<string, string | undefined>;
  checkDatabase?: (connectionString: string) => Promise<void>;
  checkTemporal?: (address: string) => Promise<void>;
};

export const healthServiceOptionsToken = Symbol('HealthServiceOptions');

@Injectable()
export class HealthService {
  private readonly env: Record<string, string | undefined>;
  private readonly checkDatabase: (connectionString: string) => Promise<void>;
  private readonly checkTemporal: (address: string) => Promise<void>;

  constructor(
    @Optional()
    @Inject(healthServiceOptionsToken)
    options: HealthServiceOptions = {},
  ) {
    this.env = options.env ?? process.env;
    this.checkDatabase = options.checkDatabase ?? checkPostgresConnection;
    this.checkTemporal = options.checkTemporal ?? checkTemporalConnection;
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const components: ReadinessComponent[] = [
      {
        name: 'api',
        status: 'up',
        required: true,
        detail: 'NestJS HTTP server is accepting requests.',
      },
      await this.getDatabaseComponent(),
      await this.getWorkflowComponent(),
      this.getAiProviderComponent(),
    ];

    return {
      status: components.some(
        (component) => component.required && component.status !== 'up',
      )
        ? 'degraded'
        : 'ready',
      service: 'group-messaging-inventory-api',
      checkedAt: new Date().toISOString(),
      components,
    };
  }

  private async getDatabaseComponent(): Promise<ReadinessComponent> {
    const connectionString = this.env.DATABASE_URL;

    if (!connectionString) {
      return {
        name: 'database',
        status: 'skipped',
        required: false,
        detail: 'DATABASE_URL is not configured; local in-memory repository is active.',
      };
    }

    try {
      await withTimeout(
        this.checkDatabase(connectionString),
        getReadinessTimeoutMs(this.env),
        'Postgres readiness check timed out.',
      );

      return {
        name: 'database',
        status: 'up',
        required: true,
        detail: 'Postgres accepted a lightweight readiness query.',
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'degraded',
        required: true,
        detail: `Postgres readiness check failed: ${toErrorMessage(error)}`,
      };
    }
  }

  private async getWorkflowComponent(): Promise<ReadinessComponent> {
    if (this.env.ANALYSIS_WORKFLOW_DRIVER !== 'temporal') {
      return {
        name: 'workflow',
        status: 'up',
        required: false,
        detail: 'Workflow driver is disabled for local enqueue-only mode.',
      };
    }

    const address = this.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233';

    try {
      await withTimeout(
        this.checkTemporal(address),
        getReadinessTimeoutMs(this.env),
        'Temporal readiness check timed out.',
      );

      return {
        name: 'workflow',
        status: 'up',
        required: true,
        detail: `Temporal accepted a connection at ${address}.`,
      };
    } catch (error) {
      return {
        name: 'workflow',
        status: 'degraded',
        required: true,
        detail: `Temporal readiness check failed: ${toErrorMessage(error)}`,
      };
    }
  }

  private getAiProviderComponent(): ReadinessComponent {
    const provider = this.env.AI_PROVIDER ?? 'noop';

    if (provider === 'noop') {
      return {
        name: 'ai-provider',
        status: 'up',
        required: false,
        detail: 'Deterministic local provider is active.',
      };
    }

    if (provider === 'openai') {
      return {
        name: 'ai-provider',
        status: this.env.OPENAI_API_KEY ? 'up' : 'degraded',
        required: true,
        detail: this.env.OPENAI_API_KEY
          ? 'OpenAI provider credentials are configured.'
          : 'OpenAI provider is selected but OPENAI_API_KEY is missing.',
      };
    }

    if (provider === 'openai-compatible') {
      return {
        name: 'ai-provider',
        status: this.env.OPENAI_COMPATIBLE_API_KEY ? 'up' : 'degraded',
        required: true,
        detail: this.env.OPENAI_COMPATIBLE_API_KEY
          ? 'OpenAI-compatible provider credentials are configured.'
          : 'OpenAI-compatible provider is selected but OPENAI_COMPATIBLE_API_KEY is missing.',
      };
    }

    return {
      name: 'ai-provider',
      status: 'degraded',
      required: true,
      detail: `Unsupported AI_PROVIDER "${provider}" is configured.`,
    };
  }
}

async function checkPostgresConnection(connectionString: string) {
  const pool = createPostgresPool({ connectionString });

  try {
    await pool.query('select 1');
  } finally {
    await pool.end();
  }
}

async function checkTemporalConnection(address: string) {
  const connection = await Connection.connect({ address });
  await connection.close();
}

function getReadinessTimeoutMs(env: Record<string, string | undefined>) {
  const value = Number(env.READINESS_TIMEOUT_MS ?? 1000);

  return Number.isFinite(value) && value > 0 ? value : 1000;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
