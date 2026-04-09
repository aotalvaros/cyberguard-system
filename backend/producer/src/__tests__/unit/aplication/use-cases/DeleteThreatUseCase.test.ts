import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DeleteThreatUseCase } from '../../../../application/use-cases/DeleteThreatUseCase';
import { Threat, ThreatRepository } from '../../../../domain/ports/ThreatRepository';
import { EventPublisher } from '../../../../domain/ports/EventPublisher';
import { ThreatNotFoundException } from '../../../../domain/exceptions/ThreatNotFoundException';


// Mock logger
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { logger } from '../../../../infrastructure/config/logger';

describe('DeleteThreatUseCase', () => {
  let deleteThreatUseCase: DeleteThreatUseCase;
  let mockRepository: ThreatRepository;
  let mockEventPublisher: EventPublisher;

  const existingThreat: Threat = {
    threatId: 'threat-123',
    type: 'malware',
    severity: 'critical',
    sourceIp: '192.168.1.100',
    description: 'Malware detected',
    timestamp: '2026-02-19T10:00:00Z'
  };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn<() => Promise<string>>().mockResolvedValue('' as never),
      findAll: jest.fn<() => Promise<Threat[]>>().mockResolvedValue([] as never),
      findById: jest.fn<() => Promise<Threat | null>>().mockResolvedValue(null as never),
      delete: jest.fn<() => Promise<boolean>>().mockResolvedValue(false as never)
    };

    mockEventPublisher = {
      publish: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as never)
    };

    deleteThreatUseCase = new DeleteThreatUseCase(mockRepository, mockEventPublisher);
    jest.spyOn(logger, 'error').mockRestore();
    jest.spyOn(logger, 'warn').mockRestore();
  });

  describe('execute', () => {
    describe('Successful Deletion', () => {
      it('should delete threat when it exists', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(true);

        // Act
        const result = await deleteThreatUseCase.execute('threat-123');

        // Assert
        expect(result.deleted).toBe(true);
        expect(result.threatId).toBe('threat-123');
        expect(result.message).toBe('Threat threat-123 deleted successfully');
      });

      it('should call findById before deleting', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(true);

        // Act
        await deleteThreatUseCase.execute('threat-123');

        // Assert
        expect(mockRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockRepository.findById).toHaveBeenCalledWith('threat-123');
      });

      it('should call delete with correct threatId', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(true);

        // Act
        await deleteThreatUseCase.execute('threat-123');

        // Assert
        expect(mockRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockRepository.delete).toHaveBeenCalledWith('threat-123');
      });

      it('should trim threatId before processing', async () => {
        // Arrange
        const trimmedThreat = { ...existingThreat, threatId: 'threat-456' };
        jest.mocked(mockRepository.findById).mockResolvedValue(trimmedThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(true);

        // Act
        const result = await deleteThreatUseCase.execute('  threat-456  ');

        // Assert
        expect(mockRepository.findById).toHaveBeenCalledWith('threat-456');
        expect(result.threatId).toBe('threat-456');
      });
    });

    describe('Threat Not Found', () => {
      it('should throw ThreatNotFoundException when threat does not exist', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(null);

        // Act & Assert
        await expect(deleteThreatUseCase.execute('nonexistent-id'))
          .rejects.toThrow(ThreatNotFoundException);
      });

      it('should throw ThreatNotFoundException with correct message', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(null);

        // Act & Assert
        await expect(deleteThreatUseCase.execute('nonexistent-id'))
          .rejects.toThrow('Threat with ID nonexistent-id not found');
      });

      it('should throw ThreatNotFoundException with correct code', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(null);

        // Act & Assert
        try {
          await deleteThreatUseCase.execute('nonexistent-id');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ThreatNotFoundException);
          if (error instanceof ThreatNotFoundException) {
            expect(error.code).toBe('THREAT_NOT_FOUND');
            expect(error.details?.threatId).toBe('nonexistent-id');
          }
        }
      });

      it('should not call delete when threat does not exist', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(null);

        // Act & Assert
        await expect(deleteThreatUseCase.execute('nonexistent-id'))
          .rejects.toThrow(ThreatNotFoundException);

        expect(mockRepository.delete).not.toHaveBeenCalled();
      });
    });

    describe('Input Validation', () => {
      it('should throw error when threatId is empty', async () => {
        // Act & Assert
        await expect(deleteThreatUseCase.execute(''))
          .rejects.toThrow('Threat ID is required');
      });

      it('should throw error when threatId is only whitespace', async () => {
        // Act & Assert
        await expect(deleteThreatUseCase.execute('   '))
          .rejects.toThrow('Threat ID is required');
      });

      it('should not call repository when threatId is invalid', async () => {
        // Act & Assert
        await expect(deleteThreatUseCase.execute(''))
          .rejects.toThrow();

        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.delete).not.toHaveBeenCalled();
      });
    });

    describe('Repository Error Handling', () => {
      it('should propagate findById errors', async () => {
        // Arrange
        const dbError = new Error('Database connection failed');
        jest.mocked(mockRepository.findById).mockRejectedValue(dbError);

        // Act & Assert
        await expect(deleteThreatUseCase.execute('threat-123'))
          .rejects.toThrow('Database connection failed');
      });

      it('should propagate delete errors', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockRejectedValue(
          new Error('Foreign key constraint')
        );

        // Act & Assert
        await expect(deleteThreatUseCase.execute('threat-123'))
          .rejects.toThrow('Foreign key constraint');
      });

      it('should throw ThreatNotFoundException if delete returns false', async () => {
        // Arrange - threat exists on findById but delete returns false (race condition)
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(false);

        // Act & Assert
        await expect(deleteThreatUseCase.execute('threat-123'))
          .rejects.toThrow(ThreatNotFoundException);
      });
    });

    describe('Result DTO', () => {
      it('should return correct DTO structure', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(true);

        // Act
        const result = await deleteThreatUseCase.execute('threat-123');

        // Assert
        expect(result).toHaveProperty('deleted');
        expect(result).toHaveProperty('threatId');
        expect(result).toHaveProperty('message');
        expect(typeof result.deleted).toBe('boolean');
        expect(typeof result.threatId).toBe('string');
        expect(typeof result.message).toBe('string');
      });

      it('should include threatId in success message', async () => {
        // Arrange
        jest.mocked(mockRepository.findById).mockResolvedValue(existingThreat);
        jest.mocked(mockRepository.delete).mockResolvedValue(true);

        // Act
        const result = await deleteThreatUseCase.execute('threat-123');

        // Assert
        expect(result.message).toContain('threat-123');
      });
    });
  });
});
