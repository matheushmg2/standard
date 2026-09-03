// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { createTestAccount } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private async initTransporter() {
    const host = this.configService.get('SMTP_HOST');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    // Se não tiver credenciais configuradas, usar Ethereal (email fake para testes)
    if (!host || !user || !pass || pass === 'sua-senha-app') {
      console.log('📧 Usando Ethereal (email fake) para testes...');
      const testAccount = await createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log(`📥 Verifique os emails em: https://ethereal.email/login`);
      console.log(`📧 Email: ${testAccount.user}`);
      console.log(`🔑 Senha: ${testAccount.pass}`);
      
      return;
    }

    // Configuração do Gmail
    this.transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(this.configService.get('SMTP_PORT') || '587'),
      secure: this.configService.get('SMTP_PORT') === '465',
      auth: {
        user: user,
        pass: pass,
      },
      // Configurações específicas para Gmail
      tls: {
        rejectUnauthorized: false,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    // Verificar conexão
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email configurado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao conectar com servidor de email:', error.message);
      console.log('📧 Usando modo de fallback (emails serão logados no console)');
    }
  }

  // ===== ENVIAR EMAIL DE VERIFICAÇÃO =====
  async sendVerificationEmail(email: string, name: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; }
            .header { background: #4CAF50; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { padding: 30px; background: white; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #4CAF50; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
            .code { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo(a)! 🎉</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name}!</h2>
              <p>Obrigado por se cadastrar. Para ativar sua conta, clique no botão abaixo:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">✅ Verificar Email</a>
              </div>
              <p>Ou copie o link abaixo no seu navegador:</p>
              <p class="code">${verificationLink}</p>
              <p><strong>⏰ Este link expira em 24 horas.</strong></p>
              <p style="color: #999; font-size: 14px;">Se você não criou uma conta, ignore este email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MeuApp. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verifique seu email - MeuApp',
      html,
    });
  }

  // ===== ENVIAR EMAIL DE RECUPERAÇÃO DE SENHA =====
  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; }
            .header { background: #f44336; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { padding: 30px; background: white; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #f44336; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
            .code { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperação de Senha 🔑</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name}!</h2>
              <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">🔐 Redefinir Senha</a>
              </div>
              <p>Ou copie o link abaixo no seu navegador:</p>
              <p class="code">${resetLink}</p>
              <p><strong>⏰ Este link expira em 1 hora.</strong></p>
              <p style="color: #999; font-size: 14px;">Se você não solicitou a recuperação, ignore este email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MeuApp. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Recuperação de Senha - MeuApp',
      html,
    });
  }

  // ===== ENVIAR EMAIL DE NOVO LOGIN =====
  async sendNewLoginEmail(email: string, name: string, ip: string, device: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; }
            .header { background: #2196F3; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { padding: 30px; background: white; }
            .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Novo Login Detectado 🔔</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name}!</h2>
              <p>Um novo login foi detectado na sua conta:</p>
              <div class="info">
                <p><strong>📍 IP:</strong> ${ip}</p>
                <p><strong>📱 Dispositivo:</strong> ${device}</p>
                <p><strong>🕐 Data:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>Se você não reconhece este login, <strong>clique aqui para proteger sua conta</strong>.</p>
              <p style="color: #999; font-size: 14px;">Esta é uma mensagem automática. Não responda este email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MeuApp. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🔔 Novo Login Detectado - MeuApp',
      html,
    });
  }

  // ===== MÉTODO BASE PARA ENVIAR EMAIL =====
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    const from = this.configService.get('EMAIL_FROM') || 'noreply@meuapp.com';

    try {
      const result = await this.transporter.sendMail({
        from: `"MeuApp" <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      });

      console.log(`✅ Email enviado para ${options.to}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Erro ao enviar email para ${options.to}:`, error.message);
      // Fallback: log do email
      console.log('📧 Conteúdo do email (fallback):');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`HTML: ${options.html.substring(0, 200)}...`);
      throw error;
    }
  }

  // ===== UTILITÁRIO: Converter HTML para Texto =====
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ===== TESTE DE CONEXÃO =====
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Conexão com servidor de email OK' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}