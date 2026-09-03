// src/auth/two-factor.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../logs/audit-log.service';
import { AuditAction } from '../logs/entities/audit-log.entity';
import { FastifyRequest } from 'fastify';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditLogService: AuditLogService,
  ) {}

  // ===== GERAR SEGREDO 2FA =====
  async generateTwoFactorSecret(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    await this.userRepository.save(user);

    let qrCodeUrl = '';
    if (secret.otpauth_url) {
      qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    }

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url,
    };
  }

  // ===== ATIVAR 2FA =====
  async enableTwoFactor(userId: string, token: string, req?: FastifyRequest) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Segredo 2FA não encontrado. Gere um novo.');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Token 2FA inválido');
    }

    user.twoFactorEnabled = true;
    const backupCodes = this.generateBackupCodes();
    user.twoFactorBackupCodes = backupCodes;
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
      warning: 'Guarde estes códigos de backup em um local seguro.',
    };
  }

  // ===== DESATIVAR 2FA =====
  async disableTwoFactor(userId: string, token: string, req?: FastifyRequest) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA não está ativado');
    }

    const isValid = this.verifyToken(user, token);
    if (!isValid) {
      throw new BadRequestException('Token 2FA inválido');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await this.userRepository.save(user);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_DISABLE,
      {},
      req,
      'Usuário desativou autenticação em 2 fatores',
    );

    return { message: '2FA desativado com sucesso' };
  }

  // ===== VERIFICAR 2FA NO LOGIN (MÉTODO ADICIONADO) =====
  async verifyTwoFactorLogin(
    userId: string,
    token: string,
    req?: FastifyRequest,
  ): Promise<{ verified: boolean; isBackupCode: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.twoFactorEnabled) {
      return { verified: false, isBackupCode: false };
    }

    const isValid = this.verifyToken(user, token);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_VERIFY,
      { success: isValid },
      req,
      isValid ? 'Verificação 2FA bem sucedida' : 'Tentativa de verificação 2FA falhou',
    );

    return { verified: isValid, isBackupCode: false };
  }

  // ===== VERIFICAR TOKEN (PRIVADO) =====
  private verifyToken(user: User, token: string): boolean {
    if (!user.twoFactorSecret) {
      return false;
    }

    // 1. Verificar TOTP
    const totpVerified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (totpVerified) {
      return true;
    }

    // 2. Verificar código de backup
    if (user.twoFactorBackupCodes && Array.isArray(user.twoFactorBackupCodes)) {
      const codeIndex = user.twoFactorBackupCodes.indexOf(token);
      if (codeIndex !== -1) {
        user.twoFactorBackupCodes.splice(codeIndex, 1);
        this.userRepository.save(user);
        return true;
      }
    }

    return false;
  }

  // ===== GERAR CÓDIGOS DE BACKUP =====
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // ===== REGENERAR BACKUP CODES =====
  async regenerateBackupCodes(userId: string, token: string, req?: FastifyRequest) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA não está ativado');
    }

    const isValid = this.verifyToken(user, token);
    if (!isValid) {
      throw new BadRequestException('Token 2FA inválido');
    }

    const backupCodes = this.generateBackupCodes();
    user.twoFactorBackupCodes = backupCodes;
    await this.userRepository.save(user);

    await this.auditLogService.log(
      userId,
      AuditAction.TWO_FACTOR_ENABLE,
      { action: 'regenerate_backup_codes' },
      req,
      'Usuário regenerou códigos de backup 2FA',
    );

    return {
      message: 'Códigos de backup regenerados com sucesso!',
      backupCodes,
      warning: 'Guarde estes códigos em um local seguro. Os anteriores foram invalidados.',
    };
  }

  // ===== VERIFICAR STATUS DO 2FA =====
  async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean; hasSecret: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    return {
      enabled: user.twoFactorEnabled,
      hasSecret: !!user.twoFactorSecret,
    };
  }
}