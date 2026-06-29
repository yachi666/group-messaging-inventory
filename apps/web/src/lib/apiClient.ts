export type GovernanceRole =
  | 'analysis_runner'
  | 'analysis_reader'
  | 'change_maker'
  | 'change_checker'
  | 'auditor';

type ApiFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  roles?: GovernanceRole[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const defaultActorId = 'web-local-user';

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

  if (options.roles?.length) {
    headers.set('x-actor-id', defaultActorId);
    headers.set('x-gmi-roles', options.roles.join(','));
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}
