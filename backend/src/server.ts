import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { logger } from './config/logger';
import { connectRabbitMQ, closeRabbitMQ } from './config/rabbitmq';
import { errorHandler } from './middlewares/error.middleware';

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
  max: 10,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Agregar rutas en próximas features
// app.use('/api/auth', authRoutes);
// app.use('/api/threats', threatRoutes);

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
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
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
