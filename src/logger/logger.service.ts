// src/logger/logger.service.ts
import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
    });
  }

  // ===== MÉTODOS BÁSICOS DO LoggerService =====
  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  // ===== MÉTODOS ESTRUTURADOS (COM METADADOS) =====
  infoWithMetadata(context: string, message: any, metadata?: Record<string, any>) {
    this.logger.info({ context, ...metadata }, message);
  }

  errorWithMetadata(context: string, message: any, metadata?: Record<string, any>) {
    this.logger.error({ context, ...metadata }, message);
  }

  warnWithMetadata(context: string, message: any, metadata?: Record<string, any>) {
    this.logger.warn({ context, ...metadata }, message);
  }

  debugWithMetadata(context: string, message: any, metadata?: Record<string, any>) {
    this.logger.debug({ context, ...metadata }, message);
  }

  // ===== MÉTODO PARA CRIAR LOGGER COM CONTEXTO =====
  getLogger(context: string) {
    return {
      log: (message: any) => this.log(message, context),
      error: (message: any, trace?: string) => this.error(message, trace, context),
      warn: (message: any) => this.warn(message, context),
      debug: (message: any) => this.debug(message, context),
      verbose: (message: any) => this.verbose(message, context),
      infoWithMetadata: (message: any, metadata?: Record<string, any>) => 
        this.infoWithMetadata(context, message, metadata),
      errorWithMetadata: (message: any, metadata?: Record<string, any>) => 
        this.errorWithMetadata(context, message, metadata),
      warnWithMetadata: (message: any, metadata?: Record<string, any>) => 
        this.warnWithMetadata(context, message, metadata),
      debugWithMetadata: (message: any, metadata?: Record<string, any>) => 
        this.debugWithMetadata(context, message, metadata),
    };
  }
}