import { auditEventsResponseSchema } from '@gmi/contracts';

import type { GovernanceEvent } from '../../domain/inventory';
import { apiFetch } from '../../lib/apiClient';

export async function fetchAuditEvents(signal?: AbortSignal): Promise<GovernanceEvent[]> {
  const response = await apiFetch('/audit-events?limit=100', {
    roles: ['auditor'],
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load audit events: ${response.status}`);
  }

  const payload = auditEventsResponseSchema.parse(await response.json());

  return payload.auditEvents.map((event) => ({
    id: event.auditEventId,
    actor: event.actorId ?? 'System',
    event: formatAction(event.action),
    target: event.changeRequestId ?? event.sourceRunId ?? event.objectId,
    timestamp: formatTimestamp(event.createdAt),
    scope: `${event.objectType}:${event.objectId}`,
    controlStatus: toControlStatus(event.afterRef),
  }));
}

function formatAction(action: string) {
  return action
    .split('_')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTimestamp(value: string) {
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function toControlStatus(value: string | null): GovernanceEvent['controlStatus'] {
  if (value === 'Approved') {
    return 'approved';
  }
  if (value === 'Rejected' || value === 'ChangesRequested') {
    return 'needs-evidence';
  }
  return 'pending-checker';
}
