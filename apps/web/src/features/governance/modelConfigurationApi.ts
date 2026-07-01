import {
  modelRuntimeConfigurationResponseSchema,
  validateModelConfigurationResponseSchema,
  type ModelRuntimeConfigurationResponse,
  type ValidateModelConfigurationRequest,
  type ValidateModelConfigurationResponse,
} from '@gmi/contracts';
import { apiFetch } from '../../lib/apiClient';

export async function fetchModelRuntimeConfiguration(
  signal?: AbortSignal,
): Promise<ModelRuntimeConfigurationResponse> {
  const response = await apiFetch('/model-configuration/runtime', {
    signal,
    roles: ['analysis_reader', 'auditor'],
  });

  if (!response.ok) {
    throw new Error(`Model runtime API returned ${response.status}`);
  }

  return modelRuntimeConfigurationResponseSchema.parse(await response.json());
}

export async function validateModelConfiguration(
  request: ValidateModelConfigurationRequest,
): Promise<ValidateModelConfigurationResponse> {
  const response = await apiFetch('/model-configuration/validate', {
    method: 'POST',
    body: JSON.stringify(request),
    roles: ['change_checker', 'auditor'],
  });

  if (!response.ok) {
    throw new Error(`Model validation API returned ${response.status}`);
  }

  return validateModelConfigurationResponseSchema.parse(await response.json());
}
