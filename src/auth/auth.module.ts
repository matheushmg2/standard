import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenRevocationService } from './token-revocation.service';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

import { User } from '../users/entities/user.entity';
import { PasswordHistory } from '../users/entities/password-history.entity';
import { PasswordHistoryService } from '../users/password-history.service';

import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';
import { LogsModule } from '../logs/logs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordHistory]),

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    RedisModule,
    EmailModule,
    LogsModule,
    SessionsModule,
  ],

  controllers: [AuthController, TwoFactorController],

  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    TokenRevocationService,
    TwoFactorService,
    PasswordHistoryService,
  ],

  exports: [AuthService, JwtAuthGuard, TokenRevocationService],
})
export class AuthModule {}
