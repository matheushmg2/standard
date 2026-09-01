import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: false,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
    });
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const verificationLink = `${this.configService.get('frontendUrl')}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #4CAF50; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Bem-vindo(a), ${name}!</h1>
            <p>Obrigado por se cadastrar. Para ativar sua conta, clique no botão abaixo:</p>
            <a href="${verificationLink}" class="button">Verificar Email</a>
            <p>Ou copie o link abaixo no seu navegador:</p>
            <p><code>${verificationLink}</code></p>
            <p>Este link expira em 24 horas.</p>
            <div class="footer">
              <p>Se você não criou uma conta, ignore este email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to: email,
      subject: 'Verifique seu email - Auth System',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetLink = `${this.configService.get('frontendUrl')}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #f44336; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Recuperação de Senha</h1>
            <p>Olá, ${name}!</p>
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
            <a href="${resetLink}" class="button">Redefinir Senha</a>
            <p>Ou copie o link abaixo no seu navegador:</p>
            <p><code>${resetLink}</code></p>
            <p>Este link expira em 1 hora.</p>
            <div class="footer">
              <p>Se você não solicitou a recuperação, ignore este email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to: email,
      subject: 'Recuperação de Senha - Auth System',
      html,
    });
  }
}