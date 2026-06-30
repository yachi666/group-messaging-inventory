export type GovernanceRole =
  | 'analysis_runner'
  | 'analysis_reader'
  | 'change_maker'
  | 'change_checker'
  | 'auditor';

export type GovernanceActor = {
  actorId: string;
  displayName: string;
  defaultRoles: GovernanceRole[];
};

const fallbackActorId = 'web-local-user';
const fallbackDisplayName = 'Priya Desai';
const fallbackRoles: GovernanceRole[] = [
  'analysis_runner',
  'analysis_reader',
  'change_maker',
  'change_checker',
  'auditor',
];

export function getGovernanceActor(): GovernanceActor {
  return {
    actorId: readNonEmptyEnv('VITE_GOVERNANCE_ACTOR_ID') ?? fallbackActorId,
    displayName:
      readNonEmptyEnv('VITE_GOVERNANCE_ACTOR_DISPLAY_NAME') ?? fallbackDisplayName,
    defaultRoles: readRolesEnv() ?? fallbackRoles,
  };
}

function readRolesEnv() {
  const rawRoles = readNonEmptyEnv('VITE_GOVERNANCE_ROLES');

  if (!rawRoles) {
    return null;
  }

  return rawRoles
    .split(',')
    .map((role: string) => role.trim())
    .filter(isGovernanceRole);
}

function readNonEmptyEnv(key: string) {
  const value = String(import.meta.env[key] ?? '').trim();
  return value ? value : null;
}

function isGovernanceRole(role: string): role is GovernanceRole {
  return (
    role === 'analysis_runner' ||
    role === 'analysis_reader' ||
    role === 'change_maker' ||
    role === 'change_checker' ||
    role === 'auditor'
  );
}
