import { reviewTasksResponseSchema } from '@gmi/contracts';

import { apiFetch } from '../../lib/apiClient';

export type ReviewTask = {
  taskId: string;
  taskType: string;
  objectType: string;
  objectId: string;
  sourceRunId: string | null;
  priority: string;
  status: 'Open' | 'Assigned' | 'InReview' | 'PendingApproval' | 'Resolved' | 'Dismissed';
  assignedTo: string | null;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
};

export async function fetchOpenReviewTasks(
  signal?: AbortSignal,
): Promise<ReadonlyArray<ReviewTask>> {
  const response = await apiFetch('/review-tasks?status=Open&objectType=template&limit=100', {
    roles: ['analysis_reader'],
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load review tasks: ${response.status}`);
  }

  const payload = reviewTasksResponseSchema.parse(await response.json());

  return payload.reviewTasks;
}
