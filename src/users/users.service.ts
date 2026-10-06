// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private geocodingService: GeocodingService, // ← Injetar
  ) { }

  // ===== CRIAR USUÁRIO =====
  async create(createUserDto: CreateUserDto) {
    const { email, password, address, ...rest } = createUserDto;

    // 1. Verificar se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    // 2. Geocodificar endereço (se fornecido)
    let locationData: Awaited<
      ReturnType<GeocodingService['geocodeAddress']>
    > = null;
    if (address) {
      locationData = await this.geocodingService.geocodeAddress(address);
    }

    // 3. Criar usuário
    const user = this.userRepository.create({
      email,
      password,
      ...rest,
      // Preencher dados de localização se disponíveis
      ...(locationData && {
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
        zipCode: locationData.postalCode,
        street: locationData.street,
        number: locationData.houseNumber,
        neighborhood: locationData.neighborhood,
      }),
    });

    return this.userRepository.save(user);
  }

  // ===== BUSCAR TODOS =====
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // ===== BUSCAR POR ID =====
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  // ===== BUSCAR POR EMAIL =====
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // ===== ATUALIZAR =====
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id); // Reutiliza a validação

    const { address, ...profileData } = updateUserDto;

    if (address) {
      const locationData = await this.geocodingService.geocodeAddress(address);

      if (locationData) {
        Object.assign(user, {
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          zipCode: locationData.postalCode,
          street: locationData.street,
          number: locationData.houseNumber,
          neighborhood: locationData.neighborhood,
        });
      }
    }

    // Allowlist explícita: não permite password, role, status ou tokens.
    Object.assign(user, profileData);

    return this.userRepository.save(user);
  }

  // ===== REMOVER =====
  async remove(id: string): Promise<User> {
    const user = await this.findOne(id);
    return this.userRepository.remove(user);
  }

  // ===== VERIFICAR SE USUÁRIO EXISTE =====
  async exists(id: string): Promise<boolean> {
    return (await this.userRepository.count({ where: { id } })) > 0;
  }

  // ===== BUSCAR POR CPF =====
  async findByCpf(cpf: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { cpf } });
  }

  // ===== BUSCAR POR CNPJ =====
  async findByCnpj(cnpj: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { cnpj } });
  }

  toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      phone: user.phone,
      whatsapp: user.whatsapp,
      birthDate: user.birthDate,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      zipCode: user.zipCode,
      street: user.street,
      number: user.number,
      complement: user.complement,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
      country: user.country,
      language: user.language,
      timezone: user.timezone,
    };
  }

  toResponseList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }

}