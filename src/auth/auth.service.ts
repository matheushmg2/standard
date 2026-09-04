// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMinutes, addDays, isAfter } from 'date-fns';
import * as crypto from 'crypto';

import { User, UserRole } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FastifyRequest } from 'fastify'; // ← Usar FastifyRequest em vez de Request do express

import { AuditLogService } from '../logs/audit-log.service';
import { AuditAction } from '../logs/entities/audit-log.entity';
import { TwoFactorService } from './two-factor.service';
import { LoginTwoFactorDto } from './dto/two-factor.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private emailService: EmailService,
    private auditLogService: AuditLogService,
    private twoFactorService: TwoFactorService,
  ) { }

  // ===== REGISTRO =====
  // src/auth/auth.service.ts
  async register(registerDto: RegisterDto, ipAddress: string, req?: FastifyRequest) {
    const { email, password, name, ...optionalData } = registerDto;

    // ===== 1. VALIDAR SENHA =====
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new BadRequestException(
        'Senha deve conter: maiúscula, minúscula, número e caractere especial (@$!%*?&)'
      );
    }

    // ===== 2. VERIFICAR SE EMAIL JÁ EXISTE =====
    const existingUser = await this.userRepository.findOne({
      where: { email }
    });
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    // ===== 3. VERIFICAR CPF/CNPJ SE FORNECIDO =====
    if (optionalData.cpf) {
      const existingCpf = await this.userRepository.findOne({
        where: { cpf: optionalData.cpf }
      });
      if (existingCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    if (optionalData.cnpj) {
      const existingCnpj = await this.userRepository.findOne({
        where: { cnpj: optionalData.cnpj }
      });
      if (existingCnpj) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    // ===== 4. GERAR TOKEN DE VERIFICAÇÃO =====
    const isDev = process.env.NODE_ENV === 'development';
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = addMinutes(new Date(), 24 * 60); // 24 horas

    // ===== 5. CRIAR USUÁRIO =====
    const user = this.userRepository.create({
      email,
      password,
      name,
      ...optionalData,
      isEmailVerified: isDev, // Auto-verificar em desenvolvimento
      emailVerificationToken: isDev ? undefined : verificationToken,
      emailVerificationTokenExpires: isDev ? undefined : verificationExpires,
    });

    await this.userRepository.save(user);

    // ===== 6. ENVIAR EMAIL DE VERIFICAÇÃO =====
    if (!isDev) {
      try {
        await this.emailService.sendVerificationEmail(
          user.email,
          user.name,
          verificationToken,
        );
        console.log(`✅ Email de verificação enviado para ${user.email}`);
      } catch (error: any) {
        console.error(`❌ Erro ao enviar email para ${user.email}:`, error.message);
        // Não bloquear o registro se o email falhar
      }
    }

    // ===== 7. LOG DE AUDITORIA =====
    await this.auditLogService.log(
      user.id,
      AuditAction.REGISTER,
      {
        email: user.email,
        ip: ipAddress,
      },
      req,
      `Usuário ${user.email} se registrou`,
    );

    // ===== 8. RETORNAR RESPOSTA =====
    return {
      message: isDev
        ? 'Usuário cadastrado com sucesso! (Email auto-verificado em desenvolvimento)'
        : 'Usuário cadastrado com sucesso! Verifique seu email para ativar sua conta.',
      userId: user.id,
    };
  }

  // ===== VERIFICAÇÃO DE EMAIL =====
  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
        isEmailVerified: false
      }
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou já utilizado');
    }

    // Corrigido: verificar se a data existe antes de comparar
    if (user.emailVerificationTokenExpires &&
      isAfter(new Date(), user.emailVerificationTokenExpires)) {
      throw new BadRequestException('Token expirado. Solicite um novo.');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;  // ← Usar undefined em vez de null
    user.emailVerificationTokenExpires = undefined;
    await this.userRepository.save(user);

    return { message: 'Email verificado com sucesso!' };
  }

  // ===== REENVIAR VERIFICAÇÃO =====
  async resendVerification(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email já verificado');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = addMinutes(new Date(), 24 * 60);
    await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    return { message: 'Novo email de verificação enviado' };
  }

  // ===== LOGIN =====
  async login(loginDto: LoginDto, ipAddress: string, userAgent: string, req?: FastifyRequest) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Conta bloqueada por muitas tentativas. Tente novamente em 30 minutos.'
      );
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Por favor, verifique seu email primeiro');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada. Contate o suporte.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.incrementLoginAttempts();
      await this.userRepository.save(user);

      const attemptsLeft = 5 - user.loginAttempts;
      throw new UnauthorizedException(
        `Credenciais inválidas. Tentativas restantes: ${Math.max(0, attemptsLeft)}`
      );
    }

    user.resetLoginAttempts();
    user.lastLoginAt = new Date();
    user.lastLoginIP = ipAddress;
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    await this.redisService.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60
    );

    await this.logAuthEvent(user.id, 'LOGIN', ipAddress, userAgent);

    const { password: _, refreshToken: __, ...userData } = user;

    // Verificar se login foi bem sucedido
    if (user && isPasswordValid) {

      const isNewDevice = await this.isNewDevice(user.id, ipAddress, userAgent);

      if (isNewDevice && process.env.NODE_ENV !== 'development') {
        try {
          await this.emailService.sendNewLoginEmail(
            user.email,
            user.name,
            ipAddress,
            userAgent,
          );
          console.log(`📧 Email de novo login enviado para ${user.email}`);
        } catch (error: any) {
          console.error(`❌ Erro ao enviar email de novo login:`, error.message);
        }
      }
      // Log de login bem sucedido
      await this.auditLogService.log(
        user.id,
        AuditAction.LOGIN,
        {
          email: user.email,
          ip: ipAddress,
          userAgent,
        },
        req,
        `Login realizado de ${userAgent}`,
      );
    } else {
      // Log de login falho
      await this.auditLogService.log(
        undefined,
        AuditAction.LOGIN_FAILED,
        {
          email: loginDto.email,
          ip: ipAddress,
          userAgent,
        },
        req,
        `Tentativa de login falha para ${loginDto.email}`,
      );
    }

    // VERIFICAR SE 2FA ESTÁ ATIVO
    if (user.twoFactorEnabled) {
      // Não gerar tokens ainda - precisa do código 2FA
      await this.auditLogService.log(
        user.id,
        AuditAction.LOGIN,
        {
          email: user.email,
          ip: ipAddress,
          userAgent,
          requiresTwoFactor: true
        },
        req,
        `Login requer verificação 2FA`,
      );

      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Autenticação em 2 fatores necessária',
      };
    }

    return {
      user: userData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.configService.get('jwt.accessExpiresIn'),
    };
  }

  private async isNewDevice(userId: string, ip: string, userAgent: string): Promise<boolean> {
    const lastLogin = await this.auditLogService.getUserLogs(userId, {
      action: AuditAction.LOGIN,
      limit: 1,
    });

    if (lastLogin.logs.length === 0) {
      return true; // Primeiro login
    }

    const last = lastLogin.logs[0];
    const lastIp = last.ipAddress;
    const lastAgent = last.userAgent;

    return lastIp !== ip || lastAgent !== userAgent;
  }

  // ===== REFRESH TOKEN =====
  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const isRevoked = await this.redisService.get(`revoked:${refreshToken}`);
    if (isRevoked) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub }
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const newTokens = await this.generateTokens(user);

      const oldRefreshToken = user.refreshToken;
      user.refreshToken = newTokens.refreshToken;
      await this.userRepository.save(user);

      await this.redisService.set(
        `revoked:${oldRefreshToken}`,
        'true',
        7 * 24 * 60 * 60
      );

      await this.redisService.set(
        `refresh_token:${user.id}`,
        newTokens.refreshToken,
        7 * 24 * 60 * 60
      );

      await this.logAuthEvent(user.id, 'REFRESH_TOKEN');

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: this.configService.get('jwt.accessExpiresIn'),
      };

    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  // ===== LOGOUT =====
  async logout(
    userId: string,
    accessToken: string,
    refreshToken: string,
    req?: FastifyRequest, // ← 4º argumento opcional
  ): Promise<{ message: string }> {
    // Revogar refresh token
    await this.redisService.set(
      `revoked:${refreshToken}`,
      'true',
      7 * 24 * 60 * 60
    );

    await this.userRepository.update(userId, { refreshToken: undefined });

    await this.redisService.del(`refresh_token:${userId}`);

    if (accessToken) {
      try {
        const decoded = this.jwtService.decode(accessToken) as any;
        const exp = decoded?.exp || 0;
        const ttl = exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redisService.set(
            `blacklist:${accessToken}`,
            'true',
            ttl
          );
        }
      } catch (e) {
        // Ignorar erro no decode
      }
    }

    // Log de logout - usando o 4º argumento
    await this.auditLogService.log(
      userId,
      AuditAction.LOGOUT,
      {},
      req, // ← Passar o req (opcional)
      'Usuário fez logout',
    );

    return { message: 'Logout realizado com sucesso' };
  }

  // ===== RECUPERAÇÃO DE SENHA =====
  // src/auth/auth.service.ts
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, req?: FastifyRequest) {
    const { email } = forgotPasswordDto;

    // ===== 1. BUSCAR USUÁRIO =====
    const user = await this.userRepository.findOne({ where: { email } });

    // ===== 2. NÃO REVELAR SE O EMAIL EXISTE (SEGURANÇA) =====
    if (!user) {
      // Sempre retornar a mesma mensagem para não expor se o email existe
      return {
        message: 'Se o email existir, enviaremos um link de recuperação'
      };
    }

    // ===== 3. GERAR TOKEN DE RECUPERAÇÃO =====
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = addMinutes(new Date(), 60); // 1 hora
    await this.userRepository.save(user);

    // ===== 4. ENVIAR EMAIL DE RECUPERAÇÃO =====
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );
      console.log(`📧 Email de recuperação enviado para ${user.email}`);
    } catch (error: any) {
      console.error(`❌ Erro ao enviar email de recuperação para ${user.email}:`, error.message);
      // Não bloquear o fluxo se o email falhar
    }

    // ===== 5. LOG DE AUDITORIA =====
    await this.auditLogService.log(
      user.id,
      AuditAction.PASSWORD_RESET,
      {
        email: user.email,
        requestedAt: new Date().toISOString(),
      },
      req,
      `Solicitação de reset de senha para ${user.email}`,
    );

    // ===== 6. RETORNAR MENSAGEM (MESMA PARA SEGURANÇA) =====
    return {
      message: 'Se o email existir, enviaremos um link de recuperação'
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: token,
      }
    });

    if (!user) {
      throw new BadRequestException('Token inválido');
    }

    if (user.passwordResetTokenExpires &&
      isAfter(new Date(), user.passwordResetTokenExpires)) {
      throw new BadRequestException('Token expirado');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await this.userRepository.save(user);

    await this.redisService.del(`refresh_token:${user.id}`);
    await this.userRepository.update(user.id, { refreshToken: undefined });

    await this.logAuthEvent(user.id, 'RESET_PASSWORD');

    return { message: 'Senha alterada com sucesso' };
  }

  // ===== TOKENS =====
  private async generateTokens(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ===== VALIDAÇÃO DE TOKEN =====
  async validateToken(token: string) {
    try {
      const isBlacklisted = await this.redisService.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revogado');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.accessSecret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário inválido');
      }

      return { userId: payload.sub, email: payload.email, role: payload.role };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  // ===== LOGGING =====
  private async logAuthEvent(userId: string, event: string, ip?: string, userAgent?: string) {
    console.log(`[AUTH] ${event} - User: ${userId} - IP: ${ip || 'N/A'} - UA: ${userAgent || 'N/A'}`);
  }

  // ===== CONTROLE DE PERMISSÕES =====
  async hasPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return false;

    const roleHierarchy = {
      [UserRole.USER]: 1,
      [UserRole.MODERATOR]: 2,
      [UserRole.ADMIN]: 3,
      [UserRole.SUPER_ADMIN]: 4,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  // ===== REVOGAÇÃO EM MASSA =====
  async revokeAllUserTokens(userId: string) {
    await this.redisService.del(`refresh_token:${userId}`);
    await this.userRepository.update(userId, { refreshToken: undefined });

    await this.logAuthEvent(userId, 'REVOKE_ALL_TOKENS');

    return { message: 'Todos os tokens foram revogados' };
  }

  // ===== MÉTODO PARA VERIFICAR BLACKLIST (usado no JwtStrategy) =====
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisService.get(`blacklist:${token}`);
    return !!result;
  }

  // ===== LOGIN COM 2FA =====
  async loginWithTwoFactor(
    loginDto: LoginTwoFactorDto,
    ipAddress: string,
    userAgent: string,
    req?: FastifyRequest,
  ) {
    const { email, password, twoFactorToken } = loginDto;

    // Validar email e senha
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar 2FA
    const { verified } = await this.twoFactorService.verifyTwoFactorLogin(
      user.id,
      twoFactorToken,
      req,
    );

    if (!verified) {
      throw new UnauthorizedException('Token 2FA inválido');
    }

    // Gerar tokens
    const tokens = await this.generateTokens(user);

    // Salvar refresh token
    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    // ... resto do login (logs, etc)

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.configService.get('jwt.accessExpiresIn'),
    };
  }
}