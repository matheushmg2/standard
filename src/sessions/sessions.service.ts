
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Not, Repository } from 'typeorm';
import type { FastifyRequest } from 'fastify';

import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';
import { hashToken } from '../common/crypto/token-hash';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async createSession(
    user: User,
    refreshToken: string,
    req?: FastifyRequest,
    deviceName?: string,
  ): Promise<Session> {
    const session = this.sessionRepository.create({
      userId: user.id,

      
      
      refreshToken: hashToken(refreshToken),

      userAgent: req?.headers?.['user-agent'] as string,
      ipAddress: req?.ip,
      deviceName: deviceName ?? this.getDeviceName(req),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(),
      isActive: true,
    });

    return this.sessionRepository.save(session);
  }

  async validateSession(
    refreshToken: string,
    expectedUserId?: string,
  ): Promise<Session | null> {
    const refreshTokenHash = hashToken(refreshToken);

    const session = await this.sessionRepository.findOne({
      where: {
        refreshToken: refreshTokenHash,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!session) {
      return null;
    }

    if (expectedUserId && session.userId !== expectedUserId) {
      return null;
    }

    session.lastActivityAt = new Date();
    await this.sessionRepository.save(session);

    return session;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      order: {
        lastActivityAt: 'DESC',
      },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
        isActive: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  async revokeAllSessionsExcept(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        userId,
        id: Not(currentSessionId),
        isActive: true,
      },
      {
        isActive: false,
      },
    );

    return result.affected ?? 0;
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        userId,
        isActive: true,
      },
      {
        isActive: false,
      },
    );

    return result.affected ?? 0;
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  private getDeviceName(req?: FastifyRequest): string {
    if (!req) {
      return 'Dispositivo Desconhecido';
    }

    const userAgent = req.headers?.['user-agent'];

    if (!userAgent) {
      return 'Dispositivo Desconhecido';
    }

    if (userAgent.includes('Mobile')) {
      return 'Mobile';
    }

    if (userAgent.includes('Tablet')) {
      return 'Tablet';
    }

    if (userAgent.includes('Mac')) {
      return 'Mac';
    }

    if (userAgent.includes('Windows')) {
      return 'Windows';
    }

    if (userAgent.includes('Linux')) {
      return 'Linux';
    }

    return 'Desktop';
  }
}
