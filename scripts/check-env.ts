// scripts/check-env.ts
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carregar .env
config();

const requiredEnvVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
];

const missingVars: string[] = [];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente faltando:');
  missingVars.forEach((v) => console.error(`  - ${v}`));
  console.error('\nVerifique seu arquivo .env');
  process.exit(1);
}

console.log('✅ Todas as variáveis de ambiente estão definidas!');