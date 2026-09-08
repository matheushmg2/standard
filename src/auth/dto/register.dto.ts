// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsDateString,
  IsPhoneNumber,
  IsUrl,
} from 'class-validator';
import { IsCPF, IsCNPJ } from 'cpf-cnpj-validator/class-validator'
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  // Campos obrigatórios
  @ApiProperty({ example: 'usuario@email.com', description: 'Email do usuário' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'João Silva', description: 'Nome completo' })
  @IsString()
  @MinLength(3, { message: 'Nome muito curto (mínimo 3 caracteres)' })
  @MaxLength(100, { message: 'Nome muito longo (máximo 100 caracteres)' })
  name: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha forte' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(50, { message: 'Senha muito longa (máximo 50 caracteres)' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Senha deve conter: maiúscula, minúscula, número e caractere especial' }
  )
  password: string;

  // 🆕 Campos opcionais
  @ApiProperty({ example: '12345678901', required: false })
  @IsOptional()
  @IsCPF({ message: 'CPF inválido' })
  cpf?: string;

  @ApiProperty({ example: '00000000000000', required: false })
  @IsOptional()
  @IsCNPJ({ message: 'CNPJ inválido' })
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'RG deve ter no máximo 13 caracteres' })
  rg?: string;

  @ApiProperty({ example: '+5511999999999', required: false })
  @IsOptional()
  @IsPhoneNumber('BR', { message: 'Telefone inválido' })
  phone?: string;

  @IsOptional()
  @IsPhoneNumber('BR', { message: 'WhatsApp inválido' })
  whatsapp?: string;

  @ApiProperty({ example: '01-01-0001', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Data de nascimento inválida' })
  birthDate?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL do avatar inválida' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio muito longa (máximo 500 caracteres)' })
  bio?: string;

  // Endereço (opcional)
  @ApiProperty({ example: '12345678', required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // Preferências (opcional)
  @IsOptional()
  language?: string;

  @IsOptional()
  timezone?: string;
}