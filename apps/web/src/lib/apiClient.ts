import { getGovernanceActor, type GovernanceRole } from './governanceActor';

export type { GovernanceRole };

type ApiFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  roles?: GovernanceRole[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const headers = new Headers(options.headers);

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const actor = getGovernanceActor();
  const roles = options.roles ?? actor.defaultRoles;

  if (roles.length) {
    headers.set('x-actor-id', actor.actorId);
    headers.set('x-gmi-roles', roles.join(','));
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}
