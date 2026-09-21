// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificar saúde da aplicação' })
  @ApiResponse({ status: 200, description: 'Aplicação saudável' })
  @ApiResponse({ status: 503, description: 'Aplicação não saudável' })
  async check() {
    return this.healthService.check();
  }

  @Public()
  @Get('readiness')
  @ApiOperation({ summary: 'Verificar se a aplicação está pronta para receber tráfego' })
  @ApiResponse({ status: 200, description: 'Aplicação pronta' })
  @ApiResponse({ status: 503, description: 'Aplicação não pronta' })
  async readiness() {
    return this.healthService.checkReadiness();
  }

  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Verificar se a aplicação está viva' })
  @ApiResponse({ status: 200, description: 'Aplicação viva' })
  @ApiResponse({ status: 503, description: 'Aplicação morta' })
  async liveness() {
    return this.healthService.checkLiveness();
  }
}