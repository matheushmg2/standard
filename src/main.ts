// src/main.ts
import { NestFactory } from '@nestjs/core';
import { 
  FastifyAdapter, 
  NestFastifyApplication 
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    })
  );

  const configService = app.get(ConfigService);

  // Helmet
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  });

  // CORS
  const frontendUrl = configService.get<string>('frontendUrl') || 'http://localhost:4000';
  await app.register(fastifyCors, {
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // Cookies
  const secret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET não está definido no arquivo .env');
  }

  await app.register(fastifyCookie, {
    secret: secret,
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });

  // Pipes de validação
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // 🔥 Prefixo global - VERIFICAR SE ESTÁ AQUI
  app.setGlobalPrefix('api'); // ← Se estiver, todas as rotas têm /api

  const port = configService.get<number>('port') || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Servidor rodando em: http://localhost:${port}`);
  console.log(`📧 Testar email: http://localhost:${port}/api/email/test`);
}

bootstrap();