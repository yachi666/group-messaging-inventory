import { Controller, Get } from '@nestjs/common';
import type { ReadinessResponse } from '@gmi/contracts';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'group-messaging-inventory-api',
    };
  }

  @Get('ready')
  getReadiness(): ReadinessResponse {
    const components: ReadinessResponse['components'] = [
      {
        name: 'api',
        status: 'up',
        required: true,
        detail: 'NestJS HTTP server is accepting requests.',
      },
      {
        name: 'database',
        status: process.env.DATABASE_URL ? 'up' : 'skipped',
        required: Boolean(process.env.DATABASE_URL),
        detail: process.env.DATABASE_URL
          ? 'DATABASE_URL is configured.'
          : 'DATABASE_URL is not configured; local in-memory repository is active.',
      },
      {
        name: 'workflow',
        status: getWorkflowStatus(),
        required: process.env.ANALYSIS_WORKFLOW_DRIVER === 'temporal',
        detail: getWorkflowDetail(),
      },
      {
        name: 'ai-provider',
        status: getAiProviderStatus(),
        required: process.env.AI_PROVIDER !== 'noop',
        detail: getAiProviderDetail(),
      },
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
}

function getWorkflowStatus(): ReadinessResponse['components'][number]['status'] {
  if (process.env.ANALYSIS_WORKFLOW_DRIVER === 'temporal') {
    return process.env.TEMPORAL_ADDRESS ? 'up' : 'degraded';
  }

  return 'up';
}

function getWorkflowDetail() {
  if (process.env.ANALYSIS_WORKFLOW_DRIVER === 'temporal') {
    return process.env.TEMPORAL_ADDRESS
      ? 'Temporal workflow driver is configured.'
      : 'Temporal workflow driver is selected but TEMPORAL_ADDRESS is missing.';
  }

  return 'Workflow driver is disabled for local enqueue-only mode.';
}

function getAiProviderStatus(): ReadinessResponse['components'][number]['status'] {
  const provider = process.env.AI_PROVIDER ?? 'noop';
  if (provider === 'noop') {
    return 'up';
  }

  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY ? 'up' : 'degraded';
  }

  if (provider === 'openai-compatible') {
    return process.env.OPENAI_COMPATIBLE_API_KEY ? 'up' : 'degraded';
  }

  return 'degraded';
}

function getAiProviderDetail() {
  const provider = process.env.AI_PROVIDER ?? 'noop';
  if (provider === 'noop') {
    return 'Deterministic local provider is active.';
  }

  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY
      ? 'OpenAI provider is configured.'
      : 'OpenAI provider is selected but OPENAI_API_KEY is missing.';
  }

  if (provider === 'openai-compatible') {
    return process.env.OPENAI_COMPATIBLE_API_KEY
      ? 'OpenAI-compatible provider is configured.'
      : 'OpenAI-compatible provider is selected but OPENAI_COMPATIBLE_API_KEY is missing.';
  }

  return `Unsupported AI_PROVIDER "${provider}" is configured.`;
}
