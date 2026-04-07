/**
 * Unit Tests: GetNotificationPreferencesUseCase
 *
 * VERIFICAR: Retorna preferencias almacenadas cuando existen.
 * VERIFICAR: Retorna defaults cuando no hay preferencias.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetNotificationPreferencesUseCase } from '../../../../application/use-cases/GetNotificationPreferencesUseCase';
import type { NotificationPreferencesRepository } from '../../../../domain/ports/NotificationPreferencesRepository';
import type { NotificationPreferences } from '../../../../domain/entities/NotificationPreferences';

const DEFAULT: NotificationPreferences = {
  username: 'admin',
  emailEnabled: false,
  whatsappEnabled: false,
  email: '',
  phone: '',
};

describe('GetNotificationPreferencesUseCase', () => {
  let useCase: GetNotificationPreferencesUseCase;
  let mockRepo: jest.Mocked<NotificationPreferencesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      getPreferences: jest.fn<() => Promise<NotificationPreferences | null>>(),
      savePreferences: jest.fn<() => Promise<void>>(),
    };
    useCase = new GetNotificationPreferencesUseCase(mockRepo);
  });

  it('should return stored preferences when they exist', async () => {
    const stored: NotificationPreferences = {
      username: 'admin',
      emailEnabled: true,
      whatsappEnabled: false,
      email: 'admin@example.com',
      phone: '',
    };
    mockRepo.getPreferences.mockResolvedValue(stored);

    const result = await useCase.execute({ username: 'admin' });

    expect(result).toEqual(stored);
    expect(mockRepo.getPreferences).toHaveBeenCalledWith('admin');
  });

  it('should return defaults when no preferences found', async () => {
    mockRepo.getPreferences.mockResolvedValue(null);

    const result = await useCase.execute({ username: 'admin' });

    expect(result).toEqual(DEFAULT);
    expect(mockRepo.getPreferences).toHaveBeenCalledWith('admin');
  });
});
