import { reviewTaskResponseSchema, reviewTasksResponseSchema } from '@gmi/contracts';

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

type ReviewTaskTransitionStatus =
  | 'Assigned'
  | 'InReview'
  | 'PendingApproval'
  | 'Resolved'
  | 'Dismissed';

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

export async function transitionReviewTask(input: {
  taskId: string;
  actorId: string;
  status: ReviewTaskTransitionStatus;
  assignedTo?: string;
  reason: string;
}): Promise<ReviewTask> {
  const response = await apiFetch(
    `/review-tasks/${encodeURIComponent(input.taskId)}/transition`,
    {
      method: 'POST',
      roles: ['analysis_runner'],
      body: JSON.stringify({
        actorId: input.actorId,
        status: input.status,
        assignedTo: input.assignedTo,
        reason: input.reason,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to transition review task: ${response.status}`);
  }

  return reviewTaskResponseSchema.parse(await response.json());
}
