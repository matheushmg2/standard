
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PasswordHistory } from './entities/password-history.entity';
import { User } from './entities/user.entity';

@Injectable()
export class PasswordHistoryService {
  private readonly MAX_HISTORY = 5; 

  constructor(
    @InjectRepository(PasswordHistory)
    private passwordHistoryRepository: Repository<PasswordHistory>,
  ) {}

  
  async addToHistory(user: User, passwordHash: string): Promise<void> {
    
    const history = this.passwordHistoryRepository.create({
      userId: user.id,
      passwordHash,
    });
    await this.passwordHistoryRepository.save(history);

    
    await this.cleanOldHistory(user.id);
  }

  
  async isPasswordReused(
    userId: string,
    newPassword: string,
  ): Promise<boolean> {
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
