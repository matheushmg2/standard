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


export class RegisterDto {
  // Campos obrigatórios
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Nome muito curto (mínimo 3 caracteres)' })
  @MaxLength(100, { message: 'Nome muito longo (máximo 100 caracteres)' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(50, { message: 'Senha muito longa (máximo 50 caracteres)' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Senha deve conter: maiúscula, minúscula, número e caractere especial' }
  )
  password: string;

  // 🆕 Campos opcionais
  @IsOptional()
  @IsCPF({ message: 'CPF inválido' })
  cpf?: string;

  @IsOptional()
  @IsCNPJ({ message: 'CNPJ inválido' })
  cnpj?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsPhoneNumber('BR', { message: 'Telefone inválido' })
  phone?: string;

  @IsOptional()
  @IsPhoneNumber('BR', { message: 'WhatsApp inválido' })
  whatsapp?: string;

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