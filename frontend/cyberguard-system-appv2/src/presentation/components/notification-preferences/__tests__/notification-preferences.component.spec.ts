// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { of, throwError } from 'rxjs';
import { NotificationPreferencesComponent } from '../notification-preferences.component';
import { GetNotificationPreferencesUseCase } from '../../../../core/application/use-cases/get-notification-preferences.use-case';
import { SaveNotificationPreferencesUseCase } from '../../../../core/application/use-cases/save-notification-preferences.use-case';
import { DEFAULT_PREFERENCES } from '../../../../core/domain/models/notification-preferences.model';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('NotificationPreferencesComponent', () => {
  let fixture: ComponentFixture<NotificationPreferencesComponent>;
  let component: NotificationPreferencesComponent;
  let mockGet: { execute: ReturnType<typeof vi.fn> };
  let mockSave: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockGet = { execute: vi.fn().mockReturnValue(of({ ...DEFAULT_PREFERENCES })) };
    mockSave = { execute: vi.fn().mockReturnValue(of(undefined)) };

    await TestBed.configureTestingModule({
      imports: [NotificationPreferencesComponent],
      providers: [
        { provide: GetNotificationPreferencesUseCase, useValue: mockGet },
        { provide: SaveNotificationPreferencesUseCase, useValue: mockSave },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPreferencesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load preferences on init', () => {
    mockGet.execute.mockReturnValue(
      of({ emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' })
    );
    fixture.detectChanges();
    expect(component.form.get('emailEnabled')?.value).toBe(true);
    expect(component.form.get('email')?.value).toBe('a@b.com');
  });

  it('should disable email field when emailEnabled is false', () => {
    fixture.detectChanges();
    const emailCtrl = component.form.get('email');
    expect(emailCtrl?.disabled).toBe(true);
  });

  it('should enable email field when emailEnabled is toggled to true', () => {
    fixture.detectChanges();
    component.form.get('emailEnabled')?.setValue(true);
    const emailCtrl = component.form.get('email');
    expect(emailCtrl?.enabled).toBe(true);
  });

  it('should disable phone field when whatsappEnabled is false', () => {
    fixture.detectChanges();
    const phoneCtrl = component.form.get('phone');
    expect(phoneCtrl?.disabled).toBe(true);
  });

  it('should enable phone field when whatsappEnabled is toggled to true', () => {
    fixture.detectChanges();
    component.form.get('whatsappEnabled')?.setValue(true);
    const phoneCtrl = component.form.get('phone');
    expect(phoneCtrl?.enabled).toBe(true);
  });

  it('should call SaveUseCase on valid form submit', () => {
    fixture.detectChanges();
    component.form.patchValue({
      emailEnabled: false,
      email: '',
      whatsappEnabled: false,
      phone: '',
    });
    component.save();
    expect(mockSave.execute).toHaveBeenCalledTimes(1);
  });

  it('should show success message after saving', () => {
    fixture.detectChanges();
    component.save();
    expect(component.saveSuccess).toBe(true);
  });

  it('should show error message on save failure', () => {
    mockSave.execute.mockReturnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    component.save();
    expect(component.savingError).toBeTruthy();
    expect(component.saveSuccess).toBe(false);
  });
});
