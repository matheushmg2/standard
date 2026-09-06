// src/sessions/sessions.controller.ts
import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class SessionsController {
  constructor(private sessionsService: SessionsService) { }

  // ===== LISTAR SESSÕES =====
  @Get()
  @ApiOperation({ summary: 'Listar todas as sessões ativas do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões',
    schema: {
      example: [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        deviceName: 'Desktop',
        ipAddress: '127.0.0.1',
        isActive: true,
        lastActivityAt: '2026-09-04T18:00:00.000Z',
        isCurrent: true,
      }],
    },
  })
  async getSessions(@Request() req: any) {
    const sessions = await this.sessionsService.getUserSessions(req.user.userId);

    // Marcar a sessão atual
    const currentSessionId = req.sessionId;
    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));
  }

  // ===== ENCERRAR SESSÃO ESPECÍFICA =====
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerrar uma sessão específica' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async revokeSession(@Param('id') id: string, @Request() req: any) {
    await this.sessionsService.revokeSession(id, req.user.userId);
  }

  // ===== ENCERRAR TODAS AS SESSÕES (EXCETO A ATUAL) =====
  @Delete('others')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerrar todas as sessões, exceto a atual' })
  @ApiResponse({ status: 200, description: 'Sessões encerradas com sucesso' })
  async revokeOtherSessions(@Request() req: any) {
    const count = await this.sessionsService.revokeAllSessionsExcept(
      req.user.userId,
      req.sessionId,
    );
    return { message: `${count} sessões encerradas` };
  }

  // ===== ENCERRAR TODAS AS SESSÕES =====
  @Delete('all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerrar todas as sessões' })
  @ApiResponse({ status: 200, description: 'Todas as sessões encerradas' })
  async revokeAllSessions(@Request() req: any) {
    const count = await this.sessionsService.revokeAllSessions(req.user.userId);
    return { message: `${count} sessões encerradas` };
  }
}