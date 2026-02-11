import { describe, it, expect, jest, beforeAll } from '@jest/globals';

// Mock RabbitMQ ANTES de importar los módulos
jest.mock('../config/rabbitmq', () => ({
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import threatRoutes from '../controllers/threat.controller';
import { config } from '../config/env';

const app = express();
app.use(express.json());
app.use('/api/threats', threatRoutes);

let validToken: string;

beforeAll(() => {
  validToken = jwt.sign(
    { username: 'admin', role: 'admin' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
});

describe('POST /api/threats', () => {

  it('should return 401 if no token provided', async () => {
    const response = await request(app)
      .post('/api/threats')
      .send({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected in system'
      });

    expect(response.status).toBe(401);
  });

  it('should return 400 if type is invalid', async () => {
    const response = await request(app)
      .post('/api/threats')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        type: 'invalid-type',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test threat'
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 if severity is invalid', async () => {
    const response = await request(app)
      .post('/api/threats')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        type: 'malware',
        severity: 'invalid',
        sourceIp: '192.168.1.100',
        description: 'Test threat'
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 if sourceIp is invalid', async () => {
    const response = await request(app)
      .post('/api/threats')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        type: 'malware',
        severity: 'high',
        sourceIp: 'invalid-ip',
        description: 'Test threat'
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 if description is too short', async () => {
    const response = await request(app)
      .post('/api/threats')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Short'
      });

    expect(response.status).toBe(400);
  });

  it('should return 202 with valid threat data', async () => {
    const response = await request(app)
      .post('/api/threats')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        type: 'malware',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'Critical malware detected in production server',
        metadata: { signature: 'Trojan.Win32' }
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('threatId');
    expect(response.body).toHaveProperty('message', 'Threat reported successfully');
    expect(response.body).toHaveProperty('status', 'processing');
  });

  it('should accept threat without optional fields', async () => {
    const response = await request(app)
      .post('/api/threats')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        type: 'phishing',
        severity: 'medium',
        sourceIp: '203.0.113.45',
        description: 'Phishing email detected from external source'
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('threatId');
  });
});

describe('GET /api/threats', () => {

  it('should return 401 if no token provided', async () => {
    const response = await request(app).get('/api/threats');
    expect(response.status).toBe(401);
  });

  it('should return list with threats', async () => {
    const response = await request(app)
      .get('/api/threats')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('threats');
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.threats)).toBe(true);
  });
});
