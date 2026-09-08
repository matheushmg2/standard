// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { GeocodingModule } from '../geocoding/geocoding.module'; // ← Importar

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    GeocodingModule, // ← Adicionar para usar o GeocodingService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // ← EXPORTAR para ser usado no AuthModule
})
export class UsersModule {}