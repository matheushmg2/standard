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

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  // ===== LISTAR SESSÕES =====
  @Get()
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
  async revokeSession(@Param('id') id: string, @Request() req: any) {
    await this.sessionsService.revokeSession(id, req.user.userId);
  }

  // ===== ENCERRAR TODAS AS SESSÕES (EXCETO A ATUAL) =====
  @Delete('others')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async revokeAllSessions(@Request() req: any) {
    const count = await this.sessionsService.revokeAllSessions(req.user.userId);
    return { message: `${count} sessões encerradas` };
  }
}