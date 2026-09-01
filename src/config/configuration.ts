
export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10) || 4000,

  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!!, 10) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!!, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!!, 10) || 6379,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS!!, 10) || 12,
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL!!, 10) || 60,
      max: parseInt(process.env.RATE_LIMIT_MAX!!, 10) || 5,
    },
  },

  frontendUrl: process.env.FRONTEND_URL,
});