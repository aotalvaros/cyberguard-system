import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { GetNotificationPreferencesUseCase } from '../../get-notification-preferences.use-case';
import { NotificationPreferencesRepository } from '../../../../domain/ports/notification-preferences.repository';
import { DEFAULT_PREFERENCES } from '../../../../domain/models/notification-preferences.model';


describe('GetNotificationPreferencesUseCase', () => {
  let useCase: GetNotificationPreferencesUseCase;
  let mockRepo: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockRepo = {
      get: vi.fn().mockReturnValue(of({ ...DEFAULT_PREFERENCES, emailEnabled: true })),
      save: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        GetNotificationPreferencesUseCase,
        { provide: NotificationPreferencesRepository, useValue: mockRepo },
      ],
    });
    useCase = TestBed.inject(GetNotificationPreferencesUseCase);
  });

  it('should delegate to repository.get()', async () => {
    const result = await firstValueFrom(useCase.execute());
    expect(result.emailEnabled).toBe(true);
    expect(mockRepo.get).toHaveBeenCalledTimes(1);
  });
});
