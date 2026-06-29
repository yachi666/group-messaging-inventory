import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
      headers: Record<string, string | string[] | undefined>;
    }>();
    const roles = parseHeaderList(request.headers['x-gmi-roles']);

    if (requiredRoles.some((role) => roles.has(role))) {
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

function parseHeaderList(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value.join(',') : value ?? '';
  return new Set(
    rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}
