import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
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
    { message: 'Senha deve conter: maiúscula, minúscula, número e caractere especial (@$!%*?&)' }
  )
  password: string;
}