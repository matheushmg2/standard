// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { LogsModule } from './logs/logs.module'; // ← Importar
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { User } from './users/entities/user.entity';
import { AuditLog } from './logs/entities/audit-log.entity'; // ← Importar a entidade
import { SessionsModule } from './sessions/sessions.module';
import { PasswordHistory } from './users/entities/password-history.entity';
import { Session } from './sessions/entities/session.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [User, AuditLog, Session, PasswordHistory], // ← Adicionar AuditLog aqui TAMBÉM!
        synchronize: false,
        migrations: ['dist/database/migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    RedisModule,
    EmailModule,
    LogsModule,
    SessionsModule, // ← Adicionar LogsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}