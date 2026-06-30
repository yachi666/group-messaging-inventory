import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  applyInternalGovernanceHeaders,
  resolveGovernanceAuthContext,
  type GovernanceAuthHeaders,
} from './governance-auth-context.js';

export const requiredRolesMetadataKey = 'gmi:required-roles';

export type GovernanceRole =
  | 'analysis_runner'
  | 'analysis_reader'
  | 'change_maker'
  | 'change_checker'
  | 'auditor';

export function RequiresRoles(...roles: GovernanceRole[]) {
  return SetMetadata(requiredRolesMetadataKey, roles);
}

@Injectable()
export class GovernanceAuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<GovernanceRole[]>(requiredRolesMetadataKey, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0 || process.env.API_AUTH_MODE === 'disabled') {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: GovernanceAuthHeaders;
    }>();
    const authContext = resolveGovernanceAuthContext(request.headers);

    if (!authContext.actorId) {
      throw new ForbiddenException({
        code: 'access_denied',
        message: 'Missing required actor identity.',
        details: {
          requiredHeader:
            authContext.mode === 'gateway'
              ? process.env.API_GATEWAY_ACTOR_HEADER ?? 'x-gmi-authenticated-actor'
              : 'x-actor-id',
        },
      });
    }

    applyInternalGovernanceHeaders(request.headers, authContext);

    if (requiredRoles.some((role) => authContext.roles.has(role))) {
      return true;
    }

    throw new ForbiddenException({
      code: 'access_denied',
      message: `Missing required role: ${requiredRoles.join(' or ')}`,
      details: {
        requiredRoles,
      },
    });
  }
}
