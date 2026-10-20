import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenRevocationService } from '../token-revocation.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenRevocationService: TokenRevocationService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const accessToken = this.extractAccessToken(request);

    this.logger.infoWithMetadata(
      'JwtAuthGuard',
      'Token recebido para validação',
      {
        hasCookieToken: Boolean(request.cookies?.access_token),
        hasAuthorizationHeader: Boolean(request.headers?.authorization),
        hasExtractedToken: Boolean(accessToken),
        method: request.method,
        url: request.url,
      },
    );

    if (!accessToken) {
      throw new UnauthorizedException('Token não informado');
    }

    const isRevoked =
      await this.tokenRevocationService.isAccessTokenRevoked(accessToken);

    if (isRevoked) {
      throw new UnauthorizedException('Token revogado');
    }

    return (await super.canActivate(context)) as boolean;
  }

  private extractAccessToken(request: FastifyRequest): string | null {
    const cookieToken = request.cookies?.access_token;

    if (cookieToken) {
      return cookieToken;
    }

    const authorization = request.headers?.authorization;

    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    return null;
  }
}
