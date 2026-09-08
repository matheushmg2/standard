// src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'João Silva Atualizado' })
  name?: string;

  @ApiPropertyOptional({ example: '+5511988888888' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua Nova, 456' })
  address?: string;
}