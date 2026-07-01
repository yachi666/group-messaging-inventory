import { OpenAICompatibleChatAnalysisAdapter } from '@gmi/ai-adapters';

const calls = [];
const sleeps = [];
const validOutput = {
  extractedPattern: 'Your payment of {amount} is due on {due_date}.',
  placeholders: [
    {
      token: '{amount}',
      type: 'currency',
      confidence: 96,
    },
    {
      token: '{due_date}',
      type: 'date',
      confidence: 94,
    },
  ],
  aiMessageType: 'Transaction',
  governanceClassificationSuggestion: 'Servicing',
  overallConfidence: 94,
  qualityScore: 91,
  candidateMatches: [
    {
      useCaseId: 'UC-PAYMENT-REMINDER',
      name: 'Payment reminder',
      similarity: 96,
      reason: 'Payment amount and due date match approved servicing reminder context.',
    },
  ],
  anomalies: [],
  businessExplanation: ['The message supports an existing customer repayment obligation.'],
  technicalEvidence: ['Detected amount and due date placeholders.'],
};

const adapter = new OpenAICompatibleChatAnalysisAdapter({
  apiKey: 'test-provider-key',
  baseUrl: 'https://provider.example/v1',
  model: 'provider-model',
  providerName: 'provider-smoke',
  timeoutMs: 5_000,
  maxRetries: 1,
  retryBackoffMs: 7,
  extraBody: {
    thinking: {
      type: 'enabled',
    },
    reasoning_effort: 'high',
  },
  fetchImpl: async (url, init) => {
    calls.push({
      url,
      init,
      body: JSON.parse(init.body),
    });

    if (calls.length === 1) {
      return new Response('rate limited', {
        status: 429,
        statusText: 'Too Many Requests',
      });
    }

    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify(validOutput),
          },
        },
      ],
    });
  },
  sleep: async (durationMs) => {
    sleeps.push(durationMs);
  },
});

const output = await adapter.analyzeTemplate({
  templateUuid: 'tpl-provider-smoke',
  versionId: 'tv-provider-smoke-v1',
  maskedContent: 'Your payment of {{amount}} is due on {{due_date}}.',
  approvedContext: ['UC-PAYMENT-REMINDER is a servicing repayment reminder.'],
  effort: 'normal',
});

assertEqual(calls.length, 2, 'retryable provider response should be retried once');
assertEqual(sleeps.length, 1, 'retry should wait once before the second attempt');
assertEqual(sleeps[0], 7, 'first retry backoff');
assertEqual(calls[0].url, 'https://provider.example/v1/chat/completions', 'chat completions URL');
assertEqual(
  calls[0].init.headers.authorization,
  'Bearer test-provider-key',
  'authorization header',
);
assertEqual(calls[0].body.model, 'provider-model', 'model in request body');
assertEqual(calls[0].body.thinking.type, 'enabled', 'provider-specific thinking option');
assertEqual(calls[0].body.reasoning_effort, 'high', 'provider-specific reasoning effort');
const userPrompt = JSON.parse(calls[0].body.messages[1].content);
assertEqual(userPrompt.outputContract.governanceClassificationSuggestion, 'one of Regulatory, Servicing, Marketing', 'output contract classification enum');
assertEqual(userPrompt.outputContract.placeholders[0].confidence, 'integer 0-100', 'output contract placeholder confidence');
assertEqual(output.aiMessageType, 'Transaction', 'parsed output message type');
assertEqual(output.placeholders.length, 2, 'parsed output placeholder count');

const deterministicCalls = [];
const deterministicAdapter = new OpenAICompatibleChatAnalysisAdapter({
  baseUrl: 'https://provider.example/v1',
  model: 'provider-model',
  fetchImpl: async () => {
    deterministicCalls.push(true);
    throw new Error('deterministic-only should not call fetch');
  },
});

const deterministicOutput = await deterministicAdapter.analyzeTemplate({
  templateUuid: 'tpl-provider-smoke',
  versionId: 'tv-provider-smoke-v1',
  maskedContent: 'Use {{otp}} to continue.',
  approvedContext: [],
  effort: 'deterministic_only',
});

assertEqual(deterministicCalls.length, 0, 'deterministic-only fetch count');
assertEqual(
  deterministicOutput.anomalies[0],
  'deterministic_only_no_ai_provider_call',
  'deterministic-only anomaly',
);

console.log('AI adapter local smoke passed.');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
