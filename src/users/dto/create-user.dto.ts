// src/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@email.com', description: 'Email do usuário' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'João Silva', description: 'Nome completo' })
  @IsString()
  @MinLength(3, { message: 'Nome muito curto' })
  @MaxLength(100, { message: 'Nome muito longo' })
  name: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha forte' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Senha deve conter maiúscula, minúscula, número e caractere especial' }
  )
  password: string;

  // Documentos
  @ApiPropertyOptional({ example: '12345678901', description: 'CPF (opcional)' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: '12345678000190', description: 'CNPJ (opcional)' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiPropertyOptional({ example: 'MG-12.345.678', description: 'RG (opcional)' })
  @IsOptional()
  @IsString()
  rg?: string;

  // Dados Pessoais
  @ApiPropertyOptional({ example: '1990-01-01', description: 'Data de nascimento' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: '+5511999999999', description: 'Telefone' })
  @IsOptional()
  @IsPhoneNumber('BR')
  phone?: string;

  @ApiPropertyOptional({ example: '+5511988888888', description: 'WhatsApp' })
  @IsOptional()
  @IsPhoneNumber('BR')
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'https://avatar.com/foto.jpg', description: 'URL do avatar' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Desenvolvedor full-stack', description: 'Biografia' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  // Endereço
  @ApiPropertyOptional({ example: 'Rua das Flores, 123', description: 'Endereço completo' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '01001-000', description: 'CEP' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores', description: 'Logradouro' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '123', description: 'Número' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Apto 45', description: 'Complemento' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro', description: 'Bairro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo', description: 'Cidade' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP', description: 'Estado' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Brasil', description: 'País' })
  @IsOptional()
  @IsString()
  country?: string;

  // Preferências
  @ApiPropertyOptional({ example: 'pt-BR', description: 'Idioma' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo', description: 'Fuso horário' })
  @IsOptional()
  @IsString()
  timezone?: string;

  // Campos internos (não expostos na API)
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
}