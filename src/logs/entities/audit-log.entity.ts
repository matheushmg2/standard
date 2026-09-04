// src/logs/entities/audit-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  // Autenticação
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  LOGIN_FAILED = 'LOGIN_FAILED',

  // Perfil
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',

  // Tokens
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKE = 'TOKEN_REVOKE',

  // Segurança
  TWO_FACTOR_ENABLE = 'TWO_FACTOR_ENABLE',
  TWO_FACTOR_DISABLE = 'TWO_FACTOR_DISABLE',
  TWO_FACTOR_VERIFY = 'TWO_FACTOR_VERIFY',

  // Admin
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_BLOCK = 'USER_BLOCK',
  USER_UNBLOCK = 'USER_UNBLOCK',

  // Sistema
  THREAT_DETECTED = 'THREAT_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action'])
@Index(['ipAddress'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;
}