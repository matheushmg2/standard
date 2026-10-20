// src/auth/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // Se não houver @Roles(), apenas o
    // JwtAuthGuard global fará a autenticação.
    if (!requiredRoles?.length) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<{
        user?: {
          userId: string;
          email: string;
          role: UserRole;
        };
      }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Usuário não autenticado',
      );
    }

    const hasRequiredRole =
      requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso',
      );
    }

    return true;
  }
}
