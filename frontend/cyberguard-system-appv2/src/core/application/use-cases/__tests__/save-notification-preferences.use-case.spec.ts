import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { of, firstValueFrom } from 'rxjs';

import { SaveNotificationPreferencesUseCase } from '../save-notification-preferences.use-case';
import { NotificationPreferencesRepository } from '../../../domain/ports/notification-preferences.repository';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


describe('SaveNotificationPreferencesUseCase', () => {
  let useCase: SaveNotificationPreferencesUseCase;
  let mockRepo: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockRepo = {
      get: vi.fn(),
      save: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        SaveNotificationPreferencesUseCase,
        { provide: NotificationPreferencesRepository, useValue: mockRepo },
      ],
    });
    useCase = TestBed.inject(SaveNotificationPreferencesUseCase);
  });

  it('should delegate to repository.save()', async () => {
    const prefs = { emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' };
    await firstValueFrom(useCase.execute(prefs));
    expect(mockRepo.save).toHaveBeenCalledWith(prefs);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
