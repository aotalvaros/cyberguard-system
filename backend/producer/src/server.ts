import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './infrastructure/config/env';
import { logger } from './infrastructure/config/logger';
import { connectRabbitMQ, closeRabbitMQ } from './infrastructure/config/rabbitmq';
import { errorHandler } from './infrastructure/http/middlewares/error.middleware';
import authRoutes from './infrastructure/http/controllers/auth.controller';
import threatRoutes from './infrastructure/http/controllers/threat.controller';

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/threats', threatRoutes);

// Error handler
app.use(errorHandler);

// Iniciar servidor
async function startServer() {
  try {
    await connectRabbitMQ();
    logger.info('RabbitMQ connected successfully');

    app.listen(config.port, () => {
      logger.info(`Backend API running on port ${config.port}`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start server', { error: message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  await closeRabbitMQ();
  process.exit(0);
});

startServer();
