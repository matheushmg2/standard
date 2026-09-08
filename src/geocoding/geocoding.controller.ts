// src/geocoding/geocoding.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Geocoding')
@Controller('geocoding')
@UseGuards(JwtAuthGuard)
export class GeocodingController {
  constructor(private geocodingService: GeocodingService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar endereço' })
  @ApiQuery({ name: 'address', description: 'Endereço para geocodificar' })
  @ApiResponse({ status: 200, description: 'Endereço encontrado' })
  async searchAddress(@Query('address') address: string) {
    return this.geocodingService.geocodeAddress(address);
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Geocodificação reversa' })
  @ApiQuery({ name: 'lat', description: 'Latitude' })
  @ApiQuery({ name: 'lng', description: 'Longitude' })
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.geocodingService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  }

  @Get('cities')
  @ApiOperation({ summary: 'Buscar cidades por nome' })
  @ApiQuery({ name: 'query', description: 'Nome da cidade' })
  async searchCities(@Query('query') query: string) {
    return this.geocodingService.searchCities(query);
  }
}