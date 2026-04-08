import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './infrastructure/config/env';
import { logger } from './infrastructure/config/logger';
import { connectRabbitMQ, closeRabbitMQ } from './infrastructure/config/rabbitmq';
import { connectRedis, closeRedis } from './infrastructure/config/redis';
import { errorHandler } from './infrastructure/http/middlewares/error.middleware';
import authRoutes from './infrastructure/http/controllers/auth.controller';
import threatRoutes from './infrastructure/http/controllers/threat.controller';
import adminRoutes from './infrastructure/http/controllers/admin.controller';
import incidentRoutes from './infrastructure/http/controllers/incident.controller';
import { statisticsRouter } from './infrastructure/http/controllers/statistics.controller';
import profileRoutes from './infrastructure/http/controllers/profile.controller';
import { profileNotificationsRouter } from './infrastructure/http/controllers/profile-notifications.controller';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300,                 
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,                  
  message: 'Too many login attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/', globalLimiter);

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/threats', threatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/statistics', statisticsRouter);
app.use('/api/admin/profile', profileRoutes);
app.use('/api/profile/notification-preferences', profileNotificationsRouter);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRedis();
    logger.info('Redis connected successfully');

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

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  await closeRedis();
  await closeRabbitMQ();
  process.exit(0);
});

startServer();
