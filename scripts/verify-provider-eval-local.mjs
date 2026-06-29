import {
  goldenTemplateCases,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';

const calls = [];
const replayOutputs = new Map(
  goldenTemplateCases.map((testCase) => [testCase.versionId, testCase.replayOutput]),
);

const providerAdapter = {
  async analyzeTemplate(input) {
    calls.push(input);
    const output = replayOutputs.get(input.versionId);

    if (!output) {
      throw new Error(`Missing replay fixture for ${input.versionId}`);
    }

    return output;
  },
};

const report = await runGoldenTemplateEvaluation({
  adapter: providerAdapter,
});

if (report.verdict !== 'pass') {
  throw new Error(`provider eval verdict should pass, got ${report.verdict}`);
}

if (calls.length !== goldenTemplateCases.length) {
  throw new Error(
    `provider adapter should be called ${goldenTemplateCases.length} times, got ${calls.length}`,
  );
}

for (const testCase of goldenTemplateCases) {
  const call = calls.find((item) => item.versionId === testCase.versionId);

  if (!call) {
    throw new Error(`provider adapter was not called for ${testCase.versionId}`);
  }

  if (call.maskedContent !== testCase.maskedContent) {
    throw new Error(`masked content mismatch for ${testCase.versionId}`);
  }
}

console.log(
  `Provider eval local smoke passed. cases=${report.metrics.caseCount}, verdict=${report.verdict}`,
);
