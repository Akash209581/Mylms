import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const rawRoles = user.roles || (user.role ? [user.role] : []);
    const userRoles: string[] = (
      Array.isArray(rawRoles)
        ? rawRoles
        : typeof rawRoles === 'string'
        ? rawRoles.split(',')
        : []
    )
      .map((r) => String(r).trim().toUpperCase())
      .filter(Boolean);

    // Fallback to single primary role if roles array empty
    if (userRoles.length === 0 && user.role) {
      userRoles.push(String(user.role).toUpperCase());
    }

    const allowed = requiredRoles.map((r) => String(r).toUpperCase());
    if (!userRoles.some((r) => allowed.includes(r))) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
