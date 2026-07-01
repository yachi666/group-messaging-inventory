import { useEffect, useState } from 'react';

import type { GovernanceReview, GovernanceTemplate, GovernanceUseCase } from '../../domain/governance';
import type {
  AnalyticsSignal,
  AuditRecord,
  CandidateUseCase,
  CoveragePoint,
  CsvUploadJob,
  DashboardMetrics,
  EvidenceMarketReadiness,
  GovernanceEvent,
  PolicyControl,
  ReportQuerySummary,
  TriageItem,
} from '../../domain/inventory';
import { apiFetch } from '../../lib/apiClient';

export type ProductInventory = {
  generatedAt: string;
  governanceTemplates: GovernanceTemplate[];
  governanceUseCases: GovernanceUseCase[];
  governanceReviews: GovernanceReview[];
  candidateUseCases: CandidateUseCase[];
  triageItems: TriageItem[];
  evidenceReadiness: EvidenceMarketReadiness[];
  auditRecords: AuditRecord[];
  analyticsSignals: AnalyticsSignal[];
  governanceEvents: GovernanceEvent[];
  policyControls: PolicyControl[];
  reportQuerySummaries: ReportQuerySummary[];
  csvUploadJob: CsvUploadJob;
  coverageFlow: CoveragePoint[];
  dashboardMetrics: DashboardMetrics;
};

type ProductInventoryState = {
  data: ProductInventory | null;
  error: string | null;
  loading: boolean;
};

export async function fetchProductInventory(signal?: AbortSignal): Promise<ProductInventory> {
  const response = await apiFetch('/product-inventory', {
    roles: ['analysis_reader', 'auditor', 'change_maker', 'change_checker', 'analysis_runner'],
    signal,
  });

  if (!response.ok) {
    throw new Error(`Product inventory API returned ${response.status}`);
  }

  return (await response.json()) as ProductInventory;
}

export function useProductInventory(): ProductInventoryState {
  const [state, setState] = useState<ProductInventoryState>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, error: null, loading: true }));

    fetchProductInventory(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Product inventory API unavailable',
          loading: false,
        });
      });

    return () => controller.abort();
  }, []);

  return state;
}
