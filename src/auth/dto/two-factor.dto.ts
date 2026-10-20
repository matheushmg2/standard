
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class EnableTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  token: string; 
}

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  token: string; 
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
  twoFactorToken: string; 
}

export class BackupCodesDto {
  @IsString()
  @IsOptional()
  code?: string; 
}
