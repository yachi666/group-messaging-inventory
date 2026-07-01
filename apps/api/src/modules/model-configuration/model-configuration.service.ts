import { Inject, Injectable, Optional } from '@nestjs/common';
import { getAiProviderRuntimeMetadata } from '@gmi/ai-adapters';
import { loadRuntimeConfig } from '@gmi/runtime-config';
import type {
  ModelRuntimeConfigurationResponse,
  ValidateModelConfigurationRequest,
  ValidateModelConfigurationResponse,
} from '@gmi/contracts';

export type ModelConfigurationServiceOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

export const modelConfigurationServiceOptionsToken = Symbol(
  'ModelConfigurationServiceOptions',
);

@Injectable()
export class ModelConfigurationService {
  private readonly env: Record<string, string | undefined>;
  private readonly fetchImpl: typeof fetch;

  constructor(
    @Optional()
    @Inject(modelConfigurationServiceOptionsToken)
    options: ModelConfigurationServiceOptions = {},
  ) {
    this.env = options.env ?? process.env;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getRuntimeConfiguration(): Promise<ModelRuntimeConfigurationResponse> {
    const config = loadRuntimeConfig('api', this.env);
    const metadata = getAiProviderRuntimeMetadata(this.env);
    const provider = config.aiProvider.provider;
    const external = provider !== 'noop';
    const baseUrl =
      provider === 'openai'
        ? 'https://api.openai.com/v1'
        : provider === 'openai-compatible'
          ? config.aiProvider.openaiCompatibleBaseUrl ?? null
          : null;
    const model =
      provider === 'openai'
        ? config.aiProvider.openaiModel ?? metadata.modelName
        : provider === 'openai-compatible'
          ? config.aiProvider.openaiCompatibleModel ?? metadata.modelName
          : metadata.modelName;
    const apiKey =
      provider === 'openai'
        ? this.env.OPENAI_API_KEY
        : provider === 'openai-compatible'
          ? this.env.OPENAI_COMPATIBLE_API_KEY
          : undefined;

    return {
      runtime: {
        provider,
        model,
        providerName:
          provider === 'openai-compatible'
            ? config.aiProvider.openaiCompatibleProviderName ?? 'openai-compatible'
            : provider,
        promptVersion: metadata.promptVersion,
        baseUrl,
        readinessMode: config.aiProvider.readinessMode,
        credentials: {
          required: external,
          configured: !external || Boolean(apiKey),
        },
        request: {
          timeoutMs:
            provider === 'openai-compatible'
              ? config.aiProvider.openaiCompatibleTimeoutMs ?? null
              : null,
          maxRetries:
            provider === 'openai-compatible'
              ? config.aiProvider.openaiCompatibleMaxRetries ?? null
              : null,
          retryBackoffMs:
            provider === 'openai-compatible'
              ? config.aiProvider.openaiCompatibleRetryBackoffMs ?? null
              : null,
          extraBodyConfigured: Boolean(config.aiProvider.openaiCompatibleExtraBody),
        },
      },
      validation: await this.validateProviderReachability({
        provider,
        apiKey,
        baseUrl,
        model,
        providerName:
          provider === 'openai-compatible'
            ? config.aiProvider.openaiCompatibleProviderName ?? 'openai-compatible'
            : provider,
        timeoutMs: config.readinessTimeoutMs,
        connectivityRequired: config.aiProvider.readinessMode === 'connectivity',
      }),
    };
  }

  async validateConfiguration(
    request: ValidateModelConfigurationRequest,
  ): Promise<ValidateModelConfigurationResponse> {
    const providerName =
      request.provider === 'openai-compatible'
        ? request.providerName ?? 'openai-compatible'
        : request.provider;
    const baseUrl =
      request.provider === 'openai'
        ? 'https://api.openai.com/v1'
        : request.provider === 'openai-compatible'
          ? request.baseUrl ?? null
          : null;

    return {
      candidate: {
        provider: request.provider,
        model: request.model,
        providerName,
        baseUrl,
        credentialsProvided: request.provider === 'noop' || Boolean(request.apiKey),
        extraBodyConfigured: Boolean(request.extraBody),
      },
      validation: await this.validateProviderReachability({
        provider: request.provider,
        apiKey: request.apiKey,
        baseUrl,
        model: request.model,
        providerName,
        timeoutMs: request.timeoutMs,
        connectivityRequired: request.provider !== 'noop',
      }),
    };
  }

  private async validateProviderReachability({
    provider,
    apiKey,
    baseUrl,
    model,
    providerName,
    timeoutMs,
    connectivityRequired,
  }: {
    provider: 'noop' | 'openai' | 'openai-compatible';
    apiKey?: string;
    baseUrl: string | null;
    model: string;
    providerName: string;
    timeoutMs: number;
    connectivityRequired: boolean;
  }): Promise<ModelRuntimeConfigurationResponse['validation']> {
    const checkedAt = new Date().toISOString();

    if (provider === 'noop') {
      return {
        status: 'skipped',
        checkedAt,
        detail: 'Deterministic local provider is active; no external model endpoint is required.',
      };
    }

    if (!apiKey) {
      return {
        status: 'degraded',
        checkedAt,
        detail: `${providerName} credentials are missing.`,
      };
    }

    if (!baseUrl || !model) {
      return {
        status: 'degraded',
        checkedAt,
        detail: `${providerName} requires both endpoint and model configuration.`,
      };
    }

    if (!connectivityRequired) {
      return {
        status: 'up',
        checkedAt,
        detail: `${providerName} credentials, endpoint, and model are configured; connectivity check is disabled.`,
      };
    }

    try {
      const response = await this.fetchImpl(`${baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        return {
          status: 'degraded',
          checkedAt,
          detail: `${providerName} models endpoint returned ${response.status} ${response.statusText}.`,
        };
      }

      return {
        status: 'up',
        checkedAt,
        detail: `${providerName} models endpoint is reachable for configured model ${model}.`,
      };
    } catch (error) {
      return {
        status: 'degraded',
        checkedAt,
        detail: `${providerName} connectivity check failed: ${toErrorMessage(error)}`,
      };
    }
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
