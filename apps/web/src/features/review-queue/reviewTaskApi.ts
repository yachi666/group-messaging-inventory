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

type ReviewTaskListStatus = ReviewTask['status'];

export async function fetchOpenReviewTasks(
  signal?: AbortSignal,
): Promise<ReadonlyArray<ReviewTask>> {
  return fetchReviewTasksByStatuses(['Open'], signal);
}

export async function fetchReviewTasksByStatuses(
  statuses: ReadonlyArray<ReviewTaskListStatus>,
  options: {
    assignedTo?: string;
    signal?: AbortSignal;
  },
): Promise<ReadonlyArray<ReviewTask>>;
export async function fetchReviewTasksByStatuses(
  statuses: ReadonlyArray<ReviewTaskListStatus>,
  signal?: AbortSignal,
): Promise<ReadonlyArray<ReviewTask>>;
export async function fetchReviewTasksByStatuses(
  statuses: ReadonlyArray<ReviewTaskListStatus>,
  input?: AbortSignal | {
    assignedTo?: string;
    signal?: AbortSignal;
  },
): Promise<ReadonlyArray<ReviewTask>> {
  const options = input instanceof AbortSignal ? { signal: input } : input ?? {};
  const taskGroups = await Promise.all(
    statuses.map(async (status) => {
      const assignedToQuery = options.assignedTo
        ? `&assignedTo=${encodeURIComponent(options.assignedTo)}`
        : '';
      const response = await apiFetch(
        `/review-tasks?status=${encodeURIComponent(status)}&objectType=template${assignedToQuery}&limit=100`,
        {
          roles: ['analysis_reader'],
          signal: options.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load review tasks: ${response.status}`);
      }

      const payload = reviewTasksResponseSchema.parse(await response.json());

      return payload.reviewTasks;
    }),
  );

  return taskGroups.flat();
}

export async function transitionReviewTask(input: {
  taskId: string;
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
