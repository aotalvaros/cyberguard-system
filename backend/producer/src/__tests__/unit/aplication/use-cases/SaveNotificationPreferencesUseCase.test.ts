/**
 * Unit Tests: SaveNotificationPreferencesUseCase
 *
 * VERIFICAR: Llama a savePreferences con los datos proporcionados.
 * VERIFICAR: Propaga errores del repositorio.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SaveNotificationPreferencesUseCase } from '../../../../application/use-cases/SaveNotificationPreferencesUseCase';
import type { NotificationPreferencesRepository } from '../../../../domain/ports/NotificationPreferencesRepository';
import type { NotificationPreferences } from '../../../../domain/entities/NotificationPreferences';

describe('SaveNotificationPreferencesUseCase', () => {
  let useCase: SaveNotificationPreferencesUseCase;
  let mockRepo: jest.Mocked<NotificationPreferencesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      getPreferences: jest.fn<() => Promise<NotificationPreferences | null>>(),
      savePreferences: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    useCase = new SaveNotificationPreferencesUseCase(mockRepo);
  });

  it('should call savePreferences with the provided data', async () => {
    const prefs: NotificationPreferences = {
      username: 'admin',
      emailEnabled: true,
      whatsappEnabled: false,
      email: 'a@b.com',
      phone: '',
    };

    await useCase.execute(prefs);

    expect(mockRepo.savePreferences).toHaveBeenCalledWith(prefs);
    expect(mockRepo.savePreferences).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors from the repository', async () => {
    mockRepo.savePreferences.mockRejectedValueOnce(new Error('Redis down'));

    await expect(
      useCase.execute({
        username: 'admin',
        emailEnabled: false,
        whatsappEnabled: false,
        email: '',
        phone: '',
      })
    ).rejects.toThrow('Redis down');
  });
});
