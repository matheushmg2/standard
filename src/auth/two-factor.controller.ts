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
import { ApiBearerAuth, ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('2FA')
@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(
    private twoFactorService: TwoFactorService,
    private authService: AuthService,
  ) { }

  // ===== GERAR QR CODE =====
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Gerar QR Code para 2FA' })
  @ApiResponse({
    status: 200,
    description: 'QR Code gerado com sucesso',
    schema: {
      example: {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,...',
        otpauthUrl: 'otpauth://totp/MeuApp:user@email.com?secret=...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async generateSecret(@Request() req: any) {
    return this.twoFactorService.generateTwoFactorSecret(req.user.userId);
  }

  // ===== ATIVAR 2FA =====
  @UseGuards(JwtAuthGuard)
  @Post('enable')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Ativar 2FA' })
  @ApiResponse({ status: 200, description: '2FA ativado com sucesso' })
  @ApiResponse({ status: 400, description: 'Token 2FA inválido' })
  @ApiBody({ type: EnableTwoFactorDto })
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
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Desativar 2FA' })
  @ApiResponse({ status: 200, description: '2FA desativado com sucesso' })
  @ApiResponse({ status: 400, description: 'Token 2FA inválido' })
  @ApiBody({ type: EnableTwoFactorDto })
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
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Verificar status do 2FA' })
  @ApiResponse({
    status: 200,
    description: 'Status do 2FA',
    schema: {
      example: {
        enabled: true,
        hasSecret: true,
      },
    },
  })
  async getStatus(@Request() req: any) {
    return this.twoFactorService.getTwoFactorStatus(req.user.userId);
  }

  // ===== REGENERAR BACKUP CODES =====
  @UseGuards(JwtAuthGuard)
  @Post('regenerate-backup-codes')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Regenerar códigos de backup 2FA' })
  @ApiResponse({ status: 200, description: 'Códigos regenerados com sucesso' })
  @ApiBody({ type: EnableTwoFactorDto })
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
  @ApiOperation({ summary: 'Login com 2FA' })
  @ApiResponse({ status: 200, description: 'Login com 2FA bem-sucedido' })
  @ApiResponse({ status: 401, description: 'Credenciais ou token 2FA inválidos' })
  @ApiBody({ type: LoginTwoFactorDto })
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