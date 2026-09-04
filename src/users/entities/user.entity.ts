// src/users/entities/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { PasswordHistory } from './password-history.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPER_ADMIN = 'super_admin',
}

@Entity('users')
export class User {
  // ===== CAMPOS EXISTENTES =====
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  @Exclude()
  refreshToken?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  emailVerificationTokenExpires?: Date;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetTokenExpires?: Date;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ nullable: true })
  lockUntil?: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  lastLoginIP?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ===== 2FA =====
  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret?: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @Exclude()
  twoFactorBackupCodes?: string[];

  // ===== 🆕 NOVOS CAMPOS =====

  // Documentos
  @Column({ nullable: true, unique: true })
  cpf?: string;

  @Column({ nullable: true, unique: true })
  cnpj?: string;

  @Column({ nullable: true })
  rg?: string;

  // Dados Pessoais
  @Column({ nullable: true })
  birthDate?: Date;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true, length: 500 })
  bio?: string;

  // Endereço
  @Column({ nullable: true })
  zipCode?: string;

  @Column({ nullable: true })
  street?: string;

  @Column({ nullable: true })
  number?: string;

  @Column({ nullable: true })
  complement?: string;

  @Column({ nullable: true })
  neighborhood?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  country?: string;

  // Preferências
  @Column({ type: 'jsonb', nullable: true, default: {} })
  preferences?: Record<string, any>;

  @Column({ nullable: true, default: 'pt-BR' })
  language?: string;

  @Column({ nullable: true, default: 'America/Sao_Paulo' })
  timezone?: string;

  @OneToMany(() => PasswordHistory, (history) => history.user)
  passwordHistory: PasswordHistory[];

  // ===== MÉTODOS EXISTENTES =====
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      this.password = await bcrypt.hash(this.password, rounds);
    }
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
  // Adicionar log para debug
  console.log('Comparando senha:', {
    plain: plainPassword,
    hash: this.password.substring(0, 20) + '...'
  });
  return bcrypt.compare(plainPassword, this.password);
}

  isLocked(): boolean {
    if (!this.lockUntil) return false;
    return new Date() < this.lockUntil;
  }

  incrementLoginAttempts(): void {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
  }
}