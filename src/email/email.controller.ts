// src/email/email.controller.ts (criar se não existir)
import { Controller, Get, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Public()
  @Get('test')
  async testConnection() {
    return this.emailService.testConnection();
  }

  @Public()
  @Post('test-verification')
  async testVerificationEmail(@Body() data: { email: string; name: string }) {
    const token = 'test-token-123456';
    await this.emailService.sendVerificationEmail(data.email, data.name, token);
    return { message: 'Email de verificação enviado!' };
  }

  @Public()
  @Post('test-reset')
  async testResetEmail(@Body() data: { email: string; name: string }) {
    const token = 'test-reset-token-123456';
    await this.emailService.sendPasswordResetEmail(data.email, data.name, token);
    return { message: 'Email de recuperação enviado!' };
  }
}