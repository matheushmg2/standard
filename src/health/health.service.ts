// src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  async check() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    const isHealthy = checks.database && checks.redis;

    return {
      status: isHealthy ? 'ok' : 'error',
      ...checks,
    };
  }

  async checkReadiness() {
    const databaseOk = await this.checkDatabase();
    const redisOk = await this.checkRedis();

    const isReady = databaseOk && redisOk;

    return {
      status: isReady ? 'ready' : 'not ready',
      database: databaseOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  async checkLiveness() {
    return {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error: any) {
      console.error('Database health check failed:', error.message);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redisService.get('health:test');
      return true;
    } catch (error: any) {
      console.error('Redis health check failed:', error.message);
      return false;
    }
  }
}