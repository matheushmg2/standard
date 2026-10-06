// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: UserRole;
  };
};

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Criar um novo usuário (Apenas Admin)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.usersService.toResponse(user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (Apenas Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return this.usersService.toResponseList(users);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar o próprio usuário ou usuário como Admin' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.assertCanAccess(id, req.user);
    const user = await this.usersService.findOne(id);
    return this.usersService.toResponse(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar o próprio perfil ou perfil como Admin' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })  
   async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.assertCanAccess(id, req.user);
    const user = await this.usersService.update(id, updateUserDto);
    return this.usersService.toResponse(user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remover um usuário (Apenas Admin)' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async remove(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.remove(id);
    return this.usersService.toResponse(user);
  }

  private assertCanAccess(
    targetUserId: string,
    currentUser: AuthenticatedRequest['user'],
  ): void {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      currentUser.role,
    );

    if (!isAdmin && currentUser.userId !== targetUserId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este usuário',
      );
    }
  }
}