import request from 'supertest';
import express from 'express';
import authRoutes from '../controllers/auth.controller';
import { describe, it, expect } from '@jest/globals';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('POST /api/auth/login', () => {
  
  it('should return 400 if username is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'test123' });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 if username is too short', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ab', password: 'test123' });
    
    expect(response.status).toBe(400);
  });

  it('should return 400 if password is too short', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '12345' });
    
    expect(response.status).toBe(400);
  });

  it('should return 401 if username does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wronguser', password: 'cyberguard2024' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should return 401 if password is incorrect', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid password');
  });

  it('should return 200 and JWT token with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'cyberguard2024' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('admin');
    expect(response.body.user.role).toBe('admin');
  });

  it('should return a valid JWT token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'cyberguard2024' });
    
    expect(response.body.token).toBeTruthy();
    expect(typeof response.body.token).toBe('string');
  });
});
