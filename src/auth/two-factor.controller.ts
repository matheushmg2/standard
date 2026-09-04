// src/auth/two-factor.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  Ip,
  Headers,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  EnableTwoFactorDto,
  VerifyTwoFactorDto,
  LoginTwoFactorDto,
} from './dto/two-factor.dto';
import { Public } from './decorators/public.decorator';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(
    private twoFactorService: TwoFactorService,
    private authService: AuthService,
  ) {}

  // ===== GERAR QR CODE =====
  @UseGuards(JwtAuthGuard)
  @Get('generate')
  async generateSecret(@Request() req: any) {
    return this.twoFactorService.generateTwoFactorSecret(req.user.userId);
  }

  // ===== ATIVAR 2FA =====
  @UseGuards(JwtAuthGuard)
  @Post('enable')
  async enableTwoFactor(
    @Request() req: any,
    @Body() enableDto: EnableTwoFactorDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.twoFactorService.enableTwoFactor(
      req.user.userId,
      enableDto.token,
      req,
    );
  }

  // ===== DESATIVAR 2FA =====
  @UseGuards(JwtAuthGuard)
  @Post('disable')
  async disableTwoFactor(
    @Request() req: any,
    @Body() enableDto: EnableTwoFactorDto,
  ) {
    return this.twoFactorService.disableTwoFactor(
      req.user.userId,
      enableDto.token,
      req,
    );
  }

  // ===== STATUS DO 2FA =====
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req: any) {
    return this.twoFactorService.getTwoFactorStatus(req.user.userId);
  }

  // ===== REGENERAR BACKUP CODES =====
  @UseGuards(JwtAuthGuard)
  @Post('regenerate-backup-codes')
  async regenerateBackupCodes(
    @Request() req: any,
    @Body() enableDto: EnableTwoFactorDto,
  ) {
    return this.twoFactorService.regenerateBackupCodes(
      req.user.userId,
      enableDto.token,
      req,
    );
  }

  // ===== LOGIN COM 2FA =====
  @Public()
  @Post('login')
  async loginWithTwoFactor(
    @Body() loginDto: LoginTwoFactorDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Request() req: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.authService.loginWithTwoFactor(
      loginDto,
      ip,
      userAgent,
      req,
    );

    // Configurar cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });

    response.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/auth/refresh',
    });

    return result;
  }
}