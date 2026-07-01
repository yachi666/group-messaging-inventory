import { ForbiddenException } from '@nestjs/common';
import { GovernanceAuthGuard } from '../apps/api/dist/auth/governance-auth.guard.js';
import {
  resolveGovernanceAuthContext,
} from '../apps/api/dist/auth/governance-auth-context.js';

const originalEnv = {
  API_AUTH_MODE: process.env.API_AUTH_MODE,
  API_GATEWAY_ACTOR_HEADER: process.env.API_GATEWAY_ACTOR_HEADER,
  API_GATEWAY_ROLES_HEADER: process.env.API_GATEWAY_ROLES_HEADER,
  API_GATEWAY_TENANT_SCOPE_HEADER: process.env.API_GATEWAY_TENANT_SCOPE_HEADER,
};

try {
  verifyHeaderMode();
  verifyGatewayMode();
  verifyDisabledMode();
  console.log('Governance auth local smoke passed.');
} finally {
  restoreEnv();
}

function verifyHeaderMode() {
  process.env.API_AUTH_MODE = 'header';
  delete process.env.API_GATEWAY_ACTOR_HEADER;
  delete process.env.API_GATEWAY_ROLES_HEADER;

  const context = resolveGovernanceAuthContext({
    'x-actor-id': 'header-actor',
    'x-gmi-roles': 'analysis_runner,auditor',
    'x-gmi-scope-tenants': 'local,tenant-a',
    'x-gmi-authenticated-actor': 'gateway-actor',
    'x-gmi-authenticated-roles': 'change_checker',
    'x-gmi-authenticated-tenant-scopes': 'tenant-b',
  });

  assertEqual(context.mode, 'header', 'header mode');
  assertEqual(context.actorId, 'header-actor', 'header actor');
  assertEqual(context.roles.has('analysis_runner'), true, 'header role');
  assertEqual(context.tenantScopes.has('local'), true, 'header tenant scope');
}

function verifyGatewayMode() {
  process.env.API_AUTH_MODE = 'gateway';
  delete process.env.API_GATEWAY_ACTOR_HEADER;
  delete process.env.API_GATEWAY_ROLES_HEADER;

  const request = {
    headers: {
      'x-actor-id': 'spoofed-local-actor',
      'x-gmi-roles': 'change_checker',
      'x-gmi-scope-tenants': 'spoofed-local',
      'x-gmi-authenticated-actor': 'gateway-actor',
      'x-gmi-authenticated-roles': 'analysis_runner,auditor',
      'x-gmi-authenticated-tenant-scopes': 'tenant-gateway',
    },
  };

  const guard = new GovernanceAuthGuard(createReflector(['analysis_runner']));
  const allowed = guard.canActivate(createExecutionContext(request));
  assertEqual(allowed, true, 'gateway guard allowed');
  assertEqual(request.headers['x-actor-id'], 'gateway-actor', 'gateway normalized actor');
  assertEqual(
    request.headers['x-gmi-roles'],
    'analysis_runner,auditor',
    'gateway normalized roles',
  );
  assertEqual(
    request.headers['x-gmi-scope-tenants'],
    'tenant-gateway',
    'gateway normalized tenant scopes',
  );

  const deniedRequest = {
    headers: {
      'x-actor-id': 'local-only-actor',
      'x-gmi-roles': 'analysis_runner',
    },
  };

  assertThrowsForbidden(
    () => guard.canActivate(createExecutionContext(deniedRequest)),
    'gateway ignores local-only headers',
  );

  process.env.API_GATEWAY_ACTOR_HEADER = 'x-custom-actor';
  process.env.API_GATEWAY_ROLES_HEADER = 'x-custom-roles';
  process.env.API_GATEWAY_TENANT_SCOPE_HEADER = 'x-custom-tenant-scopes';

  const customContext = resolveGovernanceAuthContext({
    'x-custom-actor': 'custom-gateway-actor',
    'x-custom-roles': 'change_checker',
    'x-custom-tenant-scopes': 'tenant-custom',
  });
  assertEqual(customContext.actorId, 'custom-gateway-actor', 'custom gateway actor header');
  assertEqual(customContext.roles.has('change_checker'), true, 'custom gateway role header');
  assertEqual(customContext.tenantScopes.has('tenant-custom'), true, 'custom gateway tenant scope header');
}

function verifyDisabledMode() {
  process.env.API_AUTH_MODE = 'disabled';

  const request = {
    headers: {},
  };
  const guard = new GovernanceAuthGuard(createReflector(['analysis_runner']));
  assertEqual(
    guard.canActivate(createExecutionContext(request)),
    true,
    'disabled auth allows protected route locally',
  );
}

function createReflector(roles) {
  return {
    getAllAndOverride: () => roles,
  };
}

function createExecutionContext(request) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}

function assertThrowsForbidden(fn, label) {
  try {
    fn();
  } catch (error) {
    if (error instanceof ForbiddenException) {
      return;
    }

    throw new Error(`${label}: expected ForbiddenException, got ${error}`);
  }

  throw new Error(`${label}: expected ForbiddenException`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function restoreEnv() {
  restoreEnvValue('API_AUTH_MODE', originalEnv.API_AUTH_MODE);
  restoreEnvValue('API_GATEWAY_ACTOR_HEADER', originalEnv.API_GATEWAY_ACTOR_HEADER);
  restoreEnvValue('API_GATEWAY_ROLES_HEADER', originalEnv.API_GATEWAY_ROLES_HEADER);
  restoreEnvValue(
    'API_GATEWAY_TENANT_SCOPE_HEADER',
    originalEnv.API_GATEWAY_TENANT_SCOPE_HEADER,
  );
}

function restoreEnvValue(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
