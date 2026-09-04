// src/sessions/sessions.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not } from 'typeorm'; // ← Adicionar Not
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';
import { FastifyRequest } from 'fastify';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  // ===== CRIAR SESSÃO =====
  async createSession(
    user: User,
    refreshToken: string,
    req?: FastifyRequest,
    deviceName?: string,
  ): Promise<Session> {
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshToken,
      userAgent: req?.headers?.['user-agent'] as string,
      ipAddress: req?.ip,
      deviceName: deviceName || this.getDeviceName(req),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      lastActivityAt: new Date(),
      isActive: true,
    });

    return this.sessionRepository.save(session);
  }

  // ===== VALIDAR SESSÃO =====
  async validateSession(refreshToken: string): Promise<Session | null> {
    const session = await this.sessionRepository.findOne({
      where: {
        refreshToken,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      // relations: ['user'], // ← REMOVER esta linha
    });

    if (session) {
      // Atualizar última atividade
      session.lastActivityAt = new Date();
      await this.sessionRepository.save(session);
    }

    return session;
  }

  // ===== LISTAR SESSÕES DO USUÁRIO =====
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
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
      expiresAt: MoreThan(new Date()),
    });

    return result.affected || 0;
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