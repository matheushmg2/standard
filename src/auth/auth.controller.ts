// src/auth/auth.controller.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request, 
  Get,
  Ip,
  Headers,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ip: string,
    @Request() req: FastifyRequest,
  ) {
    return this.authService.register(registerDto, ip, req);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

   @Public()
  @UseGuards(RateLimitGuard)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Request() req: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.authService.login(loginDto, ip, userAgent, req);
    
    // Verificar se precisa de 2FA
    if (result.requiresTwoFactor) {
      return result;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Garantir que os tokens existem antes de setar cookies
    if (result.accessToken && result.refreshToken) {
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
    }

    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.authService.refreshTokens(refreshTokenDto);
    
    response.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const accessToken = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    
    await this.authService.logout(req.user.userId, accessToken, refreshToken, req);
    
    response.clearCookie('access_token', { path: '/' });
    response.clearCookie('refresh_token', { path: '/auth/refresh' });

    return { message: 'Logout realizado com sucesso' };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Request() req: FastifyRequest,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto, req);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }
}