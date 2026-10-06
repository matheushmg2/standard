// src/auth/two-factor.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../logs/audit-log.service';
import {
  AuditAction,
} from '../logs/entities/audit-log.entity';

type TwoFactorVerificationResult = {
  verified: boolean;
  isBackupCode: boolean;
};

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) { }

  async generateTwoFactorSecret(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está ativado');
    }

    const secret = speakeasy.generateSecret({
      name: `MeuApp:${user.email}`,
      length: 20,
    });

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    user.twoFactorBackupCodes = undefined;

    await this.userRepository.save(user);

    const qrCode = secret.otpauth_url
      ? await QRCode.toDataURL(secret.otpauth_url)
      : '';

    return {
      secret: secret.base32,
      qrCode,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async enableTwoFactor(
    userId: string,
    token: string,
    req?: FastifyRequest,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está ativado');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Segredo 2FA não encontrado. Gere um novo.',
      );
    }

    const verified = this.verifyTotp(user.twoFactorSecret, token);

    if (!verified) {
      throw new BadRequestException('Token 2FA inválido');
    }

    // Os códigos em texto puro só são retornados uma vez.
    const backupCodes = this.generateBackupCodes();

    // Somente os hashes são armazenados no banco.
    user.twoFactorBackupCodes =
      await this.hashBackupCodes(backupCodes);

    user.twoFactorEnabled = true;

    await this.userRepository.save(user);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_ENABLE,
      {},
      req,
      'Usuário ativou autenticação em 2 fatores',
    );

    return {
      message: '2FA ativado com sucesso!',
      backupCodes,
      warning:
        'Guarde estes códigos em um local seguro. Eles não serão exibidos novamente.',
    };
  }

  async disableTwoFactor(
    userId: string,
    token: string,
    req?: FastifyRequest,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA não está ativado');
    }

    const verification = await this.verifyToken(user, token);

    if (!verification.verified) {
      throw new BadRequestException('Token 2FA inválido');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;

    await this.userRepository.save(user);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_DISABLE,
      {
        usedBackupCode: verification.isBackupCode,
      },
      req,
      'Usuário desativou autenticação em 2 fatores',
    );

    return {
      message: '2FA desativado com sucesso',
    };
  }

  async verifyTwoFactorLogin(
    userId: string,
    token: string,
    req?: FastifyRequest,
  ): Promise<{
    verified: boolean;
    isBackupCode: boolean;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.twoFactorEnabled) {
      return {
        verified: false,
        isBackupCode: false,
      };
    }

    const result = await this.verifyToken(user, token);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_VERIFY,
      {
        success: result.verified,
        usedBackupCode: result.isBackupCode,
      },
      req,
      result.verified
        ? 'Verificação 2FA bem sucedida'
        : 'Tentativa de verificação 2FA falhou',
    );

    return result;
  }


  private verifyTotp(secret: string, token: string): boolean {
    const normalizedToken = token.trim();

    if (!/^\d{6}$/.test(normalizedToken)) {
      return false;
    }

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: normalizedToken,
      window: 1,
    });
  }

  private async verifyToken(
    user: User,
    token: string,
  ): Promise<{
    verified: boolean;
    isBackupCode: boolean;
  }> {
    const normalizedToken = token.trim();

    // Primeiro verifica um código TOTP normal.
    if (
      user.twoFactorSecret &&
      this.verifyTotp(user.twoFactorSecret, normalizedToken)
    ) {
      return {
        verified: true,
        isBackupCode: false,
      };
    }

    const backupCodes = user.twoFactorBackupCodes ?? [];

    if (!Array.isArray(backupCodes)) {
      return {
        verified: false,
        isBackupCode: false,
      };
    }

    // Os valores no banco devem ser hashes bcrypt.
    for (const [index, hashedCode] of backupCodes.entries()) {
      const matches = await bcrypt.compare(
        normalizedToken,
        hashedCode,
      );

      if (!matches) {
        continue;
      }

      // Remove o código usado.
      user.twoFactorBackupCodes = backupCodes.filter(
        (_, currentIndex) => currentIndex !== index,
      );

      // Aguarda a persistência antes de liberar o login.
      await this.userRepository.save(user);

      return {
        verified: true,
        isBackupCode: true,
      };
    }

    return {
      verified: false,
      isBackupCode: false,
    };
  }


  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () =>
      randomBytes(5).toString('hex').toUpperCase(),
    );
  }

  private async hashBackupCodes(
    backupCodes: string[],
  ): Promise<string[]> {
    const rounds = Number.parseInt(
      process.env.BCRYPT_ROUNDS || '12',
      10,
    );

    return Promise.all(
      backupCodes.map((code) =>
        bcrypt.hash(code, rounds),
      ),
    );
  }

  async regenerateBackupCodes(
    userId: string,
    token: string,
    req?: FastifyRequest,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA não está ativado');
    }

    const verification = await this.verifyToken(user, token);

    if (!verification.verified) {
      throw new BadRequestException('Token 2FA inválido');
    }

    const backupCodes = this.generateBackupCodes();

    user.twoFactorBackupCodes =
      await this.hashBackupCodes(backupCodes);

    await this.userRepository.save(user);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_ENABLE,
      {
        action: 'regenerate_backup_codes',
        usedBackupCode: verification.isBackupCode,
      },
      req,
      'Usuário regenerou códigos de backup 2FA',
    );

    return {
      message: 'Códigos de backup regenerados com sucesso!',
      backupCodes,
      warning:
        'Guarde estes códigos em um local seguro. Os anteriores foram invalidados.',
    };
  }

  async getTwoFactorStatus(
    userId: string,
  ): Promise<{ enabled: boolean; hasSecret: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    return {
      enabled: user.twoFactorEnabled,
      hasSecret: Boolean(user.twoFactorSecret),
    };
  }
}
