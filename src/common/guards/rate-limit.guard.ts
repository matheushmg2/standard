import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const key = `rate_limit:${ip}`;

    const rateLimitConfig = this.configService.get('security.rateLimit');
    const ttl = rateLimitConfig.ttl;
    const maxAttempts = rateLimitConfig.max;

    const attempts = await this.redisService.get(key);
    
    if (attempts) {
      const currentAttempts = parseInt(attempts, 10);
      if (currentAttempts >= maxAttempts) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Muitas tentativas. Tente novamente em alguns minutos.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    await this.redisService.incr(key);
    
    if (!attempts) {
      await this.redisService.expire(key, ttl);
    }

    return true;
  }
}