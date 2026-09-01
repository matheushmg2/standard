// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    
    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET não está definido. Verifique seu arquivo .env'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          // Verificar em cookies
          const tokenFromCookie = request?.cookies?.access_token;
          if (tokenFromCookie) {
            return tokenFromCookie;
          }

          // Verificar em headers
          const authHeader = request?.headers?.authorization;
          if (authHeader) {
            const [type, token] = authHeader.split(' ');
            if (type === 'Bearer' && token) {
              return token;
            }
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Aqui você pode adicionar validações adicionais
    // Por exemplo, verificar se o usuário ainda existe no banco
    
    return { 
      userId: payload.sub, 
      email: payload.email,
      role: payload.role 
    };
  }
}