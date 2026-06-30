export const internalActorHeader = 'x-actor-id';
export const internalRolesHeader = 'x-gmi-roles';

export type GovernanceAuthMode = 'header' | 'gateway' | 'disabled';

export type GovernanceAuthHeaders = Record<string, string | string[] | undefined>;

export type GovernanceAuthContext = {
  mode: GovernanceAuthMode;
  actorId?: string;
  roles: Set<string>;
};

export function resolveGovernanceAuthContext(
  headers: GovernanceAuthHeaders | undefined,
  env: Record<string, string | undefined> = process.env,
): GovernanceAuthContext {
  const mode = resolveGovernanceAuthMode(env.API_AUTH_MODE);

  if (mode === 'disabled') {
    return {
      mode,
      roles: new Set(),
    };
  }

  const actorHeader =
    mode === 'gateway'
      ? normalizeHeaderName(env.API_GATEWAY_ACTOR_HEADER) ?? 'x-gmi-authenticated-actor'
      : internalActorHeader;
  const rolesHeader =
    mode === 'gateway'
      ? normalizeHeaderName(env.API_GATEWAY_ROLES_HEADER) ?? 'x-gmi-authenticated-roles'
      : internalRolesHeader;

  const actorId = normalizeHeaderValue(getHeaderValue(headers, actorHeader));

  return {
    mode,
    ...(actorId ? { actorId } : {}),
    roles: parseHeaderList(getHeaderValue(headers, rolesHeader)),
  };
}

export function applyInternalGovernanceHeaders(
  headers: GovernanceAuthHeaders,
  context: GovernanceAuthContext,
) {
  if (!context.actorId) {
    return;
  }

  headers[internalActorHeader] = context.actorId;
  headers[internalRolesHeader] = [...context.roles].join(',');
}

export function normalizeHeaderValue(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const trimmed = rawValue?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseHeaderList(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value.join(',') : value ?? '';
  return new Set(
    rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function resolveGovernanceAuthMode(value: string | undefined): GovernanceAuthMode {
  if (value === 'gateway' || value === 'disabled') {
    return value;
  }

  return 'header';
}

function normalizeHeaderName(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function getHeaderValue(headers: GovernanceAuthHeaders | undefined, headerName: string) {
  return headers?.[headerName] ?? headers?.[headerName.toLowerCase()];
}
