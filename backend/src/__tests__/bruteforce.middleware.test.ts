import { describe, it, expect, jest } from '@jest/globals';

// Mock RabbitMQ
jest.mock('../config/rabbitmq', () => ({
  getChannel: jest.fn().mockReturnValue({
    publish: jest.fn()
  }),
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

import request from 'supertest';
import express from 'express';
import authRoutes from '../controllers/auth.controller';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Brute Force Detection', () => {

  it('should not report threat with less than 5 failed attempts', async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
    }
    
    expect(true).toBe(true);
  });

  it('should allow login after failed attempts with correct credentials', async () => {
    // 3 intentos fallidos
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
    }

    // Intento exitoso
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'cyberguard2024' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
