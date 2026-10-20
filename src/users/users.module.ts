
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { GeocodingModule } from '../geocoding/geocoding.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => GeocodingModule), // ← Adicionar para usar o GeocodingService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // ← EXPORTAR para ser usado no AuthModule
})
export class UsersModule {}
