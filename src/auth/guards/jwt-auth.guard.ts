// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    console.log('🔒 JwtAuthGuard.canActivate() chamado');
    console.log('  - URL:', context.switchToHttp().getRequest().url);
    console.log('  - Headers:', context.switchToHttp().getRequest().headers);

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    
    console.log('  - isPublic:', isPublic);

    if (isPublic) {
      console.log('  ✅ Rota pública, permitindo acesso');
      return true;
    }
    
    console.log('  🔒 Rota protegida, validando token...');
    return super.canActivate(context);
  }
}