// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GeocodingService } from '../geocoding/geocoding.service';

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
    let locationData = null;
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
  async findAll() {
    return this.userRepository.find();
  }

  // ===== BUSCAR POR ID =====
  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // ===== BUSCAR POR EMAIL =====
  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  // ===== ATUALIZAR =====
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id); // Reutiliza a validação

    // Se o endereço foi atualizado, geocodificar novamente
    if (updateUserDto.address) {
      const locationData = await this.geocodingService.geocodeAddress(updateUserDto.address);
      if (locationData) {
        user.city = locationData.city;
        user.state = locationData.state;
        user.country = locationData.country;
        user.zipCode = locationData.postalCode;
        user.street = locationData.street;
        user.number = locationData.houseNumber;
        user.neighborhood = locationData.neighborhood;
      }
    }

    // Atualizar os dados
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  // ===== REMOVER =====
  async remove(id: string) {
    const user = await this.findOne(id);
    return this.userRepository.remove(user);
  }

  // ===== VERIFICAR SE USUÁRIO EXISTE =====
  async exists(id: string): Promise<boolean> {
    const count = await this.userRepository.count({ where: { id } });
    return count > 0;
  }

  // ===== BUSCAR POR CPF =====
  async findByCpf(cpf: string) {
    return this.userRepository.findOne({ where: { cpf } });
  }

  // ===== BUSCAR POR CNPJ =====
  async findByCnpj(cnpj: string) {
    return this.userRepository.findOne({ where: { cnpj } });
  }

}