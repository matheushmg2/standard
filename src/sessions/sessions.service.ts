// src/sessions/sessions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan, IsNull } from 'typeorm'; // ← Adicionar Not
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';
import { FastifyRequest } from 'fastify';
import { hashToken } from '../common/crypto/token-hash';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) { }

  // ===== CRIAR SESSÃO =====
  async createSession(
    user: User,
    refreshToken: string,
    req?: FastifyRequest,
  ): Promise<Session> {
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ),
      lastActivityAt: new Date(),
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });

    return this.sessionRepository.save(session);
  }

  // ===== VALIDAR SESSÃO =====
  async validateSession(
    refreshToken: string,
  ): Promise<Session | null> {
    const refreshTokenHash = hashToken(refreshToken);

    const session = await this.sessionRepository.findOne({
      where: {
        refreshTokenHash,
        revokedAt: IsNull(),
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      return null;
    }

    return session;
  }

  // ===== LISTAR SESSÕES DO USUÁRIO =====
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      order: { lastActivityAt: 'DESC' },
    });
  }

  // ===== ENCERRAR SESSÃO =====
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  // ===== ENCERRAR TODAS AS SESSÕES (EXCETO A ATUAL) =====
  async revokeAllSessionsExcept(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    // 🔥 CORRIGIDO: Usar Not em vez de $ne
    const result = await this.sessionRepository.update(
      {
        userId,
        id: Not(currentSessionId), // ← CORRIGIDO
        isActive: true,
      },
      { isActive: false },
    );

    return result.affected || 0;
  }

  // ===== ENCERRAR TODAS AS SESSÕES =====
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    return result.affected || 0;
  }

  // ===== LIMPAR SESSÕES EXPIRADAS =====
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  // ===== UTILITÁRIO: NOME DO DISPOSITIVO =====
  private getDeviceName(req?: FastifyRequest): string {
    if (!req) return 'Dispositivo Desconhecido';

    const ua = req.headers?.['user-agent'] as string;
    if (!ua) return 'Dispositivo Desconhecido';

    if (ua.includes('Mobile')) return 'Mobile';
    if (ua.includes('Tablet')) return 'Tablet';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Linux')) return 'Linux';

    return 'Desktop';
  }
}