// src/auth/auth.controller.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Query,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email ou CPF/CNPJ já cadastrado' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ip: string,
    @Request() req: FastifyRequest,
  ) {
    return this.authService.register(registerDto, ip, req);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiResponse({ status: 200, description: 'Login bem-sucedido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Request() req: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.authService.login(
      loginDto,
      ip,
      userAgent,
      req,
    );

    if (result.requiresTwoFactor) {
      return result;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const {
      refreshToken,
      ...responseBody
    } = result;

    if (result.accessToken && refreshToken) {
      response.setCookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 15 * 60,
        path: '/',
      });

      response.setCookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/api/auth',
      });
    }

    return responseBody;
  }


  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens de acesso' })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado',
  })
  @ApiBody({ type: RefreshTokenDto })
  async refresh(
    @Body() body: Partial<RefreshTokenDto>,
    @Request()
    req: FastifyRequest & {
      body?: Partial<RefreshTokenDto>;
    },
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const refreshToken =
      req.cookies?.refresh_token ||
      body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token não informado',
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const result = await this.authService.refreshTokens({
      refreshToken,
    });

    const {
      refreshToken: newRefreshToken,
      ...responseBody
    } = result;

    response.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });

    response.setCookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/api/auth',
    });

    return responseBody;
  }


  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Fazer logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  async logout(
    @Request() req: FastifyRequest & {
      user: {
        userId: string;
      };
      body?: {
        refreshToken?: string;
      };
    },
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const authorizationHeader = req.headers.authorization;

    const accessToken =
      req.cookies?.access_token ||
      authorizationHeader?.split(' ')[1];

    const refreshToken =
      req.cookies?.refresh_token ||
      req.body?.refreshToken;

    await this.authService.logout(
      req.user.userId,
      accessToken,
      refreshToken,
      req,
    );

    response.clearCookie('access_token', {
      path: '/',
    });

    response.clearCookie('refresh_token', {
      path: '/api/auth',
    });

    return {
      message: 'Logout realizado com sucesso',
    };
  }


  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiResponse({ status: 200, description: 'Email de recuperação enviado (se existir)' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Request() req: FastifyRequest,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto, req);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar email com token' })
  @ApiResponse({ status: 200, description: 'Email verificado com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Reenviar email de verificação' })
  @ApiResponse({ status: 200, description: 'Novo email enviado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 400, description: 'Email já verificado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'usuario@email.com',
          description: 'Email do usuário que deseja reenviar a verificação'
        }
      },
      required: ['email']
    }
  })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }
}