export const mockConfig = {
  port: 3000,
  rabbitmqUrl: 'amqp://mock:mock@localhost:5672',
  jwtSecret: 'test-jwt-secret-key-for-testing',
  allowedOrigins: ['http://localhost:4200'],
  nodeEnv: 'test',
  adminUsername: 'admin',
  adminPassword: 'testpassword123'
};

export const createConfigMock = () => ({
  config: mockConfig
});