import { Agent, Runner, setDefaultOpenAIKey } from '@openai/agents';
import { aiTemplateAnalysisOutputSchema } from '@gmi/contracts';
import type { AiTemplateAnalysisOutput, AnalysisEffort } from '@gmi/domain';
import type { OutputGuardrail } from '@openai/agents';

export type AiTemplateAnalysisInput = {
  templateUuid: string;
  versionId: string;
  maskedContent: string;
  approvedContext: ReadonlyArray<string>;
  effort: AnalysisEffort;
};

export type AiAnalysisAdapter = {
  analyzeTemplate(input: AiTemplateAnalysisInput): Promise<AiTemplateAnalysisOutput>;
};

export type AiProviderName = 'noop' | 'openai' | 'openai-compatible';

export type AiAdapterEnv = Record<string, string | undefined>;

export type AiProviderRuntimeMetadata = {
  provider: AiProviderName;
  modelName: string;
  promptVersion: string;
};

export class ReplayAnalysisAdapter implements AiAnalysisAdapter {
  constructor(private readonly output: AiTemplateAnalysisOutput) {}

  async analyzeTemplate(): Promise<AiTemplateAnalysisOutput> {
    return this.output;
  }
}

export type OpenAIAgentsAnalysisAdapterOptions = {
  apiKey?: string;
  model?: string;
  traceIncludeSensitiveData?: boolean;
};

export type OpenAICompatibleChatAnalysisAdapterOptions = {
  apiKey?: string;
  baseUrl: string;
  model: string;
  providerName?: string;
  extraBody?: Record<string, unknown>;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (durationMs: number) => Promise<void>;
};

const templateAnalysisOutputGuardrail: OutputGuardrail<
  typeof aiTemplateAnalysisOutputSchema
> = {
  name: 'template_analysis_output_quality',
  execute: async ({ agentOutput }) => {
    const parsed = aiTemplateAnalysisOutputSchema.safeParse(agentOutput);

    if (!parsed.success) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          code: 'schema_validation_failed',
          issues: parsed.error.issues,
        },
      };
    }

    const output = parsed.data;
    const hasUsefulExplanation =
      output.businessExplanation.length > 0 && output.technicalEvidence.length > 0;
    const confidenceIsCoherent =
      output.overallConfidence >= 0 &&
      output.overallConfidence <= 100 &&
      output.qualityScore >= 0 &&
      output.qualityScore <= 100;

    return {
      tripwireTriggered: !hasUsefulExplanation || !confidenceIsCoherent,
      outputInfo: {
        code: 'quality_gate',
        hasUsefulExplanation,
        confidenceIsCoherent,
      },
    };
  },
};

export class OpenAIAgentsAnalysisAdapter implements AiAnalysisAdapter {
  private readonly model: string;
  private readonly traceIncludeSensitiveData: boolean;

  constructor(options: OpenAIAgentsAnalysisAdapterOptions = {}) {
    this.model = options.model ?? 'gpt-5.4-mini';
    this.traceIncludeSensitiveData = options.traceIncludeSensitiveData ?? false;

    if (options.apiKey) {
      setDefaultOpenAIKey(options.apiKey);
    }
  }

  async analyzeTemplate(input: AiTemplateAnalysisInput): Promise<AiTemplateAnalysisOutput> {
    if (input.effort === 'deterministic_only') {
      return createDeterministicOnlyOutput(input);
    }

    const agent = new Agent({
      name: 'Template Analysis Harness Agent',
      instructions: [
        'You analyze governed messaging templates for an enterprise inventory system.',
        'You are one step inside a larger backend harness, not the system of record.',
        'Use only masked template content and approved context supplied in the input.',
        'Do not infer personal data, customer identity, or production facts that are not present.',
        'Classify governance impact as exactly one of Regulatory, Servicing, or Marketing.',
        'Prefer uncertainty and anomalies over overconfident mappings.',
        'Candidate matches are suggestions only; do not claim a governed merge has happened.',
        'Return structured data that matches the configured output schema.',
      ].join('\n'),
      model: this.model,
      modelSettings: {
        reasoning: {
          effort: input.effort === 'enhanced_review' ? 'medium' : 'low',
          summary: 'concise',
        },
        text: {
          verbosity: 'low',
        },
        store: true,
      },
      outputType: aiTemplateAnalysisOutputSchema,
      outputGuardrails: [templateAnalysisOutputGuardrail],
    });

    const runner = new Runner({
      tracingDisabled: false,
      traceIncludeSensitiveData: this.traceIncludeSensitiveData,
      workflowName: 'template-analysis-harness',
      groupId: input.templateUuid,
      traceMetadata: {
        templateUuid: input.templateUuid,
        versionId: input.versionId,
        effort: input.effort,
      },
    });

    const result = await runner.run(agent, buildAnalysisPrompt(input), {
      maxTurns: input.effort === 'enhanced_review' ? 4 : 2,
      stream: false,
    });

    return aiTemplateAnalysisOutputSchema.parse(result.finalOutput);
  }
}

export class OpenAICompatibleChatAnalysisAdapter implements AiAnalysisAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly providerName: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly sleep: (durationMs: number) => Promise<void>;

  constructor(private readonly options: OpenAICompatibleChatAnalysisAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.providerName = options.providerName ?? 'openai-compatible';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBackoffMs = options.retryBackoffMs ?? 250;
    this.sleep = options.sleep ?? sleep;
  }

  async analyzeTemplate(input: AiTemplateAnalysisInput): Promise<AiTemplateAnalysisOutput> {
    if (input.effort === 'deterministic_only') {
      return createDeterministicOnlyOutput(input);
    }

    const response = await this.fetchChatCompletion(input);

    if (!response.ok) {
      throw createProviderHttpError(
        this.providerName,
        response.status,
        response.statusText,
      );
    }

    const body = await response.json();
    const content = extractChatCompletionContent(body);
    const parsedJson = parseJsonObject(content);

    return aiTemplateAnalysisOutputSchema.parse(parsedJson);
  }

  private async fetchChatCompletion(input: AiTemplateAnalysisInput) {
    const requestUrl = `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const requestInit = this.buildRequestInit(input);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchImpl(requestUrl, {
          ...requestInit,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.ok || !isRetryableStatus(response.status) || attempt === this.maxRetries) {
          return response;
        }

        lastError = createProviderHttpError(
          this.providerName,
          response.status,
          response.statusText,
        );
        await this.waitBeforeRetry(attempt);
      } catch (error) {
        lastError = error;

        if (attempt === this.maxRetries) {
          throw createProviderNetworkError(this.providerName, error);
        }

        await this.waitBeforeRetry(attempt);
      }
    }

    throw createProviderNetworkError(this.providerName, lastError);
  }

  private async waitBeforeRetry(attempt: number) {
    const delayMs = this.retryBackoffMs * 2 ** attempt;

    if (delayMs > 0) {
      await this.sleep(delayMs);
    }
  }

  private buildRequestInit(input: AiTemplateAnalysisInput): RequestInit {
    return {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.options.apiKey
          ? {
              authorization: `Bearer ${this.options.apiKey}`,
            }
          : {}),
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          {
            role: 'system',
            content: [
              'You analyze governed messaging templates for an enterprise inventory system.',
              'Use only masked template content and approved context supplied in the user message.',
              'Return one JSON object matching the requested schema. Do not return markdown.',
              'Prefer uncertainty over unsupported claims.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: buildAnalysisPrompt(input),
          },
        ],
        temperature: 0.1,
        response_format: {
          type: 'json_object',
        },
        ...(this.options.extraBody ?? {}),
      }),
    };
  }
}

export function createAiAnalysisAdapterFromEnv(
  env: AiAdapterEnv = {},
): AiAnalysisAdapter {
  const provider = normalizeProviderName(env.AI_PROVIDER);

  if (provider === 'openai') {
    return new OpenAIAgentsAnalysisAdapter({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      traceIncludeSensitiveData: env.OPENAI_TRACE_INCLUDE_SENSITIVE_DATA === 'true',
    });
  }

  if (provider === 'openai-compatible') {
    return new OpenAICompatibleChatAnalysisAdapter({
      apiKey: env.OPENAI_COMPATIBLE_API_KEY,
      baseUrl: env.OPENAI_COMPATIBLE_BASE_URL ?? 'http://127.0.0.1:4001/v1',
      model: env.OPENAI_COMPATIBLE_MODEL ?? 'local-model',
      providerName: env.OPENAI_COMPATIBLE_PROVIDER_NAME,
      extraBody: parseExtraBody(env.OPENAI_COMPATIBLE_EXTRA_BODY_JSON),
      timeoutMs: parseOptionalPositiveInteger(
        env.OPENAI_COMPATIBLE_TIMEOUT_MS,
        'OPENAI_COMPATIBLE_TIMEOUT_MS',
      ),
      maxRetries: parseOptionalNonNegativeInteger(
        env.OPENAI_COMPATIBLE_MAX_RETRIES,
        'OPENAI_COMPATIBLE_MAX_RETRIES',
      ),
      retryBackoffMs: parseOptionalNonNegativeInteger(
        env.OPENAI_COMPATIBLE_RETRY_BACKOFF_MS,
        'OPENAI_COMPATIBLE_RETRY_BACKOFF_MS',
      ),
    });
  }

  return new NoopAnalysisAdapter();
}

export function getAiProviderRuntimeMetadata(
  env: AiAdapterEnv = {},
): AiProviderRuntimeMetadata {
  const provider = normalizeProviderName(env.AI_PROVIDER);

  if (provider === 'openai') {
    return {
      provider,
      modelName: env.OPENAI_MODEL ?? 'gpt-5.4-mini',
      promptVersion: 'template-analysis-agent@openai-agents-v1',
    };
  }

  if (provider === 'openai-compatible') {
    const providerName = env.OPENAI_COMPATIBLE_PROVIDER_NAME ?? 'openai-compatible';

    return {
      provider,
      modelName: `${providerName}:${env.OPENAI_COMPATIBLE_MODEL ?? 'local-model'}`,
      promptVersion: 'template-analysis-agent@openai-compatible-chat-v1',
    };
  }

  return {
    provider: 'noop',
    modelName: 'noop-local',
    promptVersion: 'template-analysis-agent@noop',
  };
}

function normalizeProviderName(provider: string | undefined): AiProviderName {
  if (provider === 'openai') {
    return 'openai';
  }

  if (provider === 'openai-compatible') {
    return 'openai-compatible';
  }

  return 'noop';
}

function parseExtraBody(extraBodyJson: string | undefined) {
  if (!extraBodyJson) {
    return undefined;
  }

  const parsed = JSON.parse(extraBodyJson) as unknown;

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  throw new Error('OPENAI_COMPATIBLE_EXTRA_BODY_JSON must be a JSON object.');
}

function parseOptionalPositiveInteger(value: string | undefined, name: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  throw new Error(`${name} must be a positive integer.`);
}

function parseOptionalNonNegativeInteger(value: string | undefined, name: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }

  throw new Error(`${name} must be a non-negative integer.`);
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function createProviderHttpError(providerName: string, status: number, statusText: string) {
  return new Error(
    `provider_error:${providerName}:http_${status}:${statusText || 'provider request failed'}`,
  );
}

function createProviderNetworkError(providerName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return new Error(`provider_error:${providerName}:network:${message}`);
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function buildAnalysisPrompt(input: AiTemplateAnalysisInput) {
  return JSON.stringify(
    {
      task: 'Analyze this masked messaging template version for extraction, governance classification, candidate use-case matching, anomalies, and evidence.',
      constraints: [
        'The template content is already masked. Do not attempt to reconstruct unmasked values.',
        'Use candidate matches only when approved context supports them.',
        'Use low confidence when evidence is incomplete.',
        'Return exactly one JSON object using the outputContract field names and types.',
        'Do not wrap the response in markdown, explanations, or alternative nested objects.',
      ],
      outputContract: getAnalysisOutputContract(),
      template: {
        templateUuid: input.templateUuid,
        versionId: input.versionId,
        maskedContent: input.maskedContent,
      },
      approvedContext: input.approvedContext,
      effort: input.effort,
    },
    null,
    2,
  );
}

function getAnalysisOutputContract() {
  return {
    extractedPattern: 'string; normalized masked template pattern, keeping placeholders in braces',
    placeholders: [
      {
        token: 'string; placeholder token including braces, for example {amount}',
        type: 'one of currency, date, account, otp, name, unknown',
        confidence: 'integer 0-100',
      },
    ],
    aiMessageType: 'string; for example OTP, Transaction, Marketing, Profile update, or Alert',
    governanceClassificationSuggestion: 'one of Regulatory, Servicing, Marketing',
    overallConfidence: 'integer 0-100',
    qualityScore: 'integer 0-100',
    candidateMatches: [
      {
        useCaseId: 'string',
        name: 'string',
        similarity: 'integer 0-100',
        reason: 'string',
      },
    ],
    anomalies: ['string array; use [] when none'],
    businessExplanation: ['string array; business-facing rationale'],
    technicalEvidence: ['string array; technical evidence from masked content and approved context'],
  };
}

function createDeterministicOnlyOutput(
  input: AiTemplateAnalysisInput,
): AiTemplateAnalysisOutput {
  return {
    extractedPattern: input.maskedContent,
    placeholders: [],
    aiMessageType: 'Unknown',
    governanceClassificationSuggestion: 'Servicing',
    overallConfidence: 0,
    qualityScore: 0,
    candidateMatches: [],
    anomalies: ['deterministic_only_no_ai_provider_call'],
    businessExplanation: [
      'The run was configured for deterministic-only analysis, so no model provider was called.',
    ],
    technicalEvidence: [`Template version ${input.versionId} was analyzed without AI inference.`],
  };
}

export class NoopAnalysisAdapter implements AiAnalysisAdapter {
  async analyzeTemplate(input: AiTemplateAnalysisInput): Promise<AiTemplateAnalysisOutput> {
    return {
      extractedPattern: input.maskedContent,
      placeholders: [],
      aiMessageType: 'Unknown',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 0,
      qualityScore: 0,
      candidateMatches: [],
      anomalies: ['noop_adapter_used'],
      businessExplanation: [
        'No AI provider is configured. This placeholder output is for local scaffolding only.',
      ],
      technicalEvidence: [`Template version ${input.versionId} was passed to the noop adapter.`],
    };
  }
}

function extractChatCompletionContent(body: unknown) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'choices' in body &&
    Array.isArray(body.choices)
  ) {
    const [choice] = body.choices;

    if (
      typeof choice === 'object' &&
      choice !== null &&
      'message' in choice &&
      typeof choice.message === 'object' &&
      choice.message !== null &&
      'content' in choice.message &&
      typeof choice.message.content === 'string'
    ) {
      return choice.message.content;
    }
  }

  throw new Error('openai-compatible provider returned an unsupported response shape');
}

function parseJsonObject(content: string) {
  try {
    const parsed = JSON.parse(content) as unknown;

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to a provider-facing error with a stable message.
  }

  throw new Error('openai-compatible provider returned non-object JSON content');
}
