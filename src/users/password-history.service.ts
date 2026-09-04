// src/users/password-history.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PasswordHistory } from './entities/password-history.entity';
import { User } from './entities/user.entity';

@Injectable()
export class PasswordHistoryService {
  private readonly MAX_HISTORY = 5; // Manter últimas 5 senhas

  constructor(
    @InjectRepository(PasswordHistory)
    private passwordHistoryRepository: Repository<PasswordHistory>,
  ) {}

  // ===== ADICIONAR SENHA AO HISTÓRICO =====
  async addToHistory(user: User, passwordHash: string): Promise<void> {
    // Adicionar nova senha
    const history = this.passwordHistoryRepository.create({
      userId: user.id,
      passwordHash,
    });
    await this.passwordHistoryRepository.save(history);

    // Manter apenas as últimas MAX_HISTORY senhas
    await this.cleanOldHistory(user.id);
  }

  // ===== VERIFICAR SE SENHA JÁ FOI USADA =====
  async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    const history = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: this.MAX_HISTORY,
    });

    for (const entry of history) {
      const isMatch = await bcrypt.compare(newPassword, entry.passwordHash);
      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  // ===== LIMPAR HISTÓRICO ANTIGO =====
  private async cleanOldHistory(userId: string): Promise<void> {
    const history = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (history.length > this.MAX_HISTORY) {
      const toRemove = history.slice(this.MAX_HISTORY);
      const ids = toRemove.map((entry) => entry.id);
      await this.passwordHistoryRepository.delete(ids);
    }
  }
}