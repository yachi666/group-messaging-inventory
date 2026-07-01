import { Inject, Injectable, Optional } from '@nestjs/common';
import { Connection } from '@temporalio/client';
import { createPostgresPool } from '@gmi/db';
import type { ReadinessResponse } from '@gmi/contracts';

type ReadinessComponent = ReadinessResponse['components'][number];

export type AiProviderReadinessCheckInput = {
  provider: 'openai' | 'openai-compatible';
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type HealthServiceOptions = {
  env?: Record<string, string | undefined>;
  checkDatabase?: (connectionString: string) => Promise<void>;
  checkTemporal?: (address: string) => Promise<void>;
  checkAiProvider?: (input: AiProviderReadinessCheckInput) => Promise<void>;
};

export const healthServiceOptionsToken = Symbol('HealthServiceOptions');

@Injectable()
export class HealthService {
  private readonly env: Record<string, string | undefined>;
  private readonly checkDatabase: (connectionString: string) => Promise<void>;
  private readonly checkTemporal: (address: string) => Promise<void>;
  private readonly checkAiProvider: (input: AiProviderReadinessCheckInput) => Promise<void>;

  constructor(
    @Optional()
    @Inject(healthServiceOptionsToken)
    options: HealthServiceOptions = {},
  ) {
    this.env = options.env ?? process.env;
    this.checkDatabase = options.checkDatabase ?? checkPostgresConnection;
    this.checkTemporal = options.checkTemporal ?? checkTemporalConnection;
    this.checkAiProvider = options.checkAiProvider ?? checkAiProviderConnection;
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
      await this.getAiProviderComponent(),
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

  private async getAiProviderComponent(): Promise<ReadinessComponent> {
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
      return this.getExternalAiProviderComponent({
        provider,
        apiKey: this.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        model: this.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
        label: 'OpenAI',
      });
    }

    if (provider === 'openai-compatible') {
      return this.getExternalAiProviderComponent({
        provider,
        apiKey: this.env.OPENAI_COMPATIBLE_API_KEY,
        baseUrl: this.env.OPENAI_COMPATIBLE_BASE_URL ?? 'http://127.0.0.1:4001/v1',
        model: this.env.OPENAI_COMPATIBLE_MODEL ?? 'local-model',
        label: this.env.OPENAI_COMPATIBLE_PROVIDER_NAME ?? 'OpenAI-compatible',
      });
    }

    return {
      name: 'ai-provider',
      status: 'degraded',
      required: true,
      detail: `Unsupported AI_PROVIDER "${provider}" is configured.`,
    };
  }

  private async getExternalAiProviderComponent({
    provider,
    apiKey,
    baseUrl,
    model,
    label,
  }: {
    provider: AiProviderReadinessCheckInput['provider'];
    apiKey?: string;
    baseUrl: string;
    model: string;
    label: string;
  }): Promise<ReadinessComponent> {
    if (!apiKey) {
      return {
        name: 'ai-provider',
        status: 'degraded',
        required: true,
        detail: `${label} provider is selected but credentials are missing.`,
      };
    }

    if (!baseUrl || !model) {
      return {
        name: 'ai-provider',
        status: 'degraded',
        required: true,
        detail: `${label} provider requires both endpoint and model configuration.`,
      };
    }

    if (this.env.AI_PROVIDER_READINESS_MODE !== 'connectivity') {
      return {
        name: 'ai-provider',
        status: 'up',
        required: true,
        detail: `${label} provider credentials, endpoint, and model are configured; connectivity check is disabled.`,
      };
    }

    try {
      await withTimeout(
        this.checkAiProvider({ provider, apiKey, baseUrl, model }),
        getReadinessTimeoutMs(this.env),
        `${label} provider connectivity check timed out.`,
      );

      return {
        name: 'ai-provider',
        status: 'up',
        required: true,
        detail: `${label} provider connectivity check succeeded for model ${model}.`,
      };
    } catch (error) {
      return {
        name: 'ai-provider',
        status: 'degraded',
        required: true,
        detail: `${label} provider connectivity check failed: ${toErrorMessage(error)}`,
      };
    }
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

async function checkAiProviderConnection(input: AiProviderReadinessCheckInput) {
  const response = await fetch(`${input.baseUrl.replace(/\/$/, '')}/models`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`models endpoint returned ${response.status} ${response.statusText}`);
  }
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
