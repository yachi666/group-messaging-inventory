import {
  changeRequestEvidencePackageSchema,
  changeRequestResponseSchema,
  changeRequestsResponseSchema,
} from '@gmi/contracts';

import { apiFetch } from '../../lib/apiClient';

export type ChangeRequestStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Rejected'
  | 'ChangesRequested'
  | 'Withdrawn';

export type ChangeRequest = {
  changeRequestId: string;
  status: ChangeRequestStatus;
  objectType: 'template';
  objectId: string;
  baseRevision: number;
  sourceRunId: string;
  createdAt: string;
  idempotencyKey: string | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
  checkedBy?: string | null;
  checkedAt?: string | null;
  decisionReason?: string | null;
};

export type ChangeRequestEvidencePackage = {
  packageId: string;
  exportedAt: string;
  changeRequest: ChangeRequest;
  proposedPatch: Record<string, unknown>;
  sourceRun: {
    runId: string;
    status: string;
    templateUuid: string;
    versionId: string;
    output?: {
      extractedPattern: string;
      aiMessageType: string;
      governanceClassificationSuggestion: string;
      overallConfidence: number;
      qualityScore: number;
    };
  };
  auditEvents: Array<{
    auditEventId: string;
    actorId: string | null;
    action: string;
    createdAt: string;
  }>;
};

export async function fetchPendingChangeRequests(
  signal?: AbortSignal,
): Promise<ReadonlyArray<ChangeRequest>> {
  const response = await apiFetch('/change-requests?status=PendingApproval&limit=100', {
    roles: ['change_checker'],
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load pending change requests: ${response.status}`);
  }

  const payload = changeRequestsResponseSchema.parse(await response.json());

  if (!Array.isArray(payload.changeRequests)) {
    throw new Error('Pending change request response is malformed.');
  }

  return payload.changeRequests;
}

export async function decideChangeRequest(input: {
  changeRequestId: string;
  decision: 'Approved' | 'Rejected' | 'ChangesRequested';
  reason: string;
}): Promise<ChangeRequest> {
  const response = await apiFetch(
    `/change-requests/${encodeURIComponent(input.changeRequestId)}/decision`,
    {
      body: JSON.stringify({
        decision: input.decision,
        reason: input.reason,
      }),
      method: 'POST',
      roles: ['change_checker'],
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to decide change request: ${response.status}`);
  }

  return changeRequestResponseSchema.parse(await response.json());
}

export async function fetchChangeRequestEvidencePackage(
  changeRequestId: string,
): Promise<ChangeRequestEvidencePackage> {
  const response = await apiFetch(
    `/change-requests/${encodeURIComponent(changeRequestId)}/evidence-package`,
    {
      roles: ['change_checker'],
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load change request evidence package: ${response.status}`);
  }

  return changeRequestEvidencePackageSchema.parse(await response.json());
}
