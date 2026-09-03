// src/auth/dto/two-factor.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class EnableTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  token: string; // Código de verificação do Google Authenticator
}

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  token: string; // Código de verificação do Google Authenticator
}

export class LoginTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  twoFactorToken: string; // Código do 2FA
}

export class BackupCodesDto {
  @IsString()
  @IsOptional()
  code?: string; // Código de backup para recuperação
}