import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'node:crypto';

@Injectable()
export class TokenRevocationService {
  private readonly refreshTokenTtl = 7 * 24 * 60 * 60;

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  private key(type: 'access' | 'refresh', token: string): string {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    return `blacklist:${type}:${tokenHash}`;
  }

  async revokeAccessToken(accessToken: string): Promise<void> {
    const payload = this.jwtService.decode(accessToken) as {
      exp?: number;
    } | null;

    const ttl = this.getTtl(payload?.exp);

    if (ttl > 0) {
      await this.redisService.set(this.key('access', accessToken), '1', ttl);
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.redisService.set(
      this.key('refresh', refreshToken),
      '1',
      this.refreshTokenTtl,
    );
  }

  async isAccessTokenRevoked(accessToken: string): Promise<boolean> {
    const value = await this.redisService.get(this.key('access', accessToken));

    return Boolean(value);
  }

  async isRefreshTokenRevoked(refreshToken: string): Promise<boolean> {
    const value = await this.redisService.get(
      this.key('refresh', refreshToken),
    );

    return Boolean(value);
  }

  private getTtl(exp?: number): number {
    if (!exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - now);
  }
}
