import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

// ⚠️ HUMAN CHECK:
// Validamos las variables de entorno críticas al inicio.
// La IA no incluía esta validación obligatoria.
const requiredEnvVars = ['PORT', 'RABBITMQ_URL', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export const config = {
  port: Number.parseInt(process.env.PORT || '3000'),
  rabbitmqUrl: process.env.RABBITMQ_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  nodeEnv: process.env.NODE_ENV || 'development'
};
