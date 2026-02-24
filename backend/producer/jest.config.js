module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/unit/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/server.ts',
    // Infraestructura de bootstrap: requieren conexiones reales (PostgreSQL, RabbitMQ, Firebase).
    // Se testean via integration tests, no unit tests (principio de Arquitectura Hexagonal).
    '!src/infrastructure/config/**',
    '!src/infrastructure/factories/**',
    // Adaptadores legacy de persistencia (deuda técnica P2 en DEBT_REPORT_BACKEND.md):
    // requieren mocks complejos de Pool o testcontainers. Se priorizan integraciones.
    '!src/infrastructure/persistence/PostgresThreatRepository.ts',
    '!src/infrastructure/persistence/PostgresAuditLogRepository.ts',
    '!src/infrastructure/persistence/PostgresUserRepository.ts',
    // Admin controller — requiere setup de roles y sesiones; cubierto en E2E/integración.
    '!src/infrastructure/http/controllers/admin.controller.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  verbose: true
};
