import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('jwt.accessSecret');

    if (!secret) {
      throw new Error(
        'JWT access secret não está definido. ' +
          'Verifique sua configuração de ambiente.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          const cookieToken = request?.cookies?.access_token;

          if (cookieToken) {
            return cookieToken;
          }

          const authorization = request?.headers?.authorization;

          if (authorization && authorization.startsWith('Bearer ')) {
            return authorization.substring(7);
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
