import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

function validateEnvVars() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente faltando: ${missing.join(', ')}\n` +
      `Verifique seu arquivo .env`
    );
  }
}

validateEnvVars();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,

  entities: [path.resolve(__dirname, 'src/**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, 'src/database/migrations/*{.ts,.js}')],

  synchronize: false,
  logging: process.env.NODE_ENV === 'development',

  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
  },

  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,

  migrationsRun: false,
  migrationsTableName: 'migrations',
});