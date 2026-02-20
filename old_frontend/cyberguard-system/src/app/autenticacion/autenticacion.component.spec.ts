import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError, delay } from 'rxjs';
import { AutenticacionComponent } from './autenticacion.component';
import { AuthService } from '../services/auth.service';

describe('AutenticacionComponent', () => {
  let component: AutenticacionComponent;
  let fixture: ComponentFixture<AutenticacionComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['login']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AutenticacionComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AutenticacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
      expect(component.form.value).toEqual({
        username: '',
        password: '',
        remember: false
      });
    });

    it('should have required validators', () => {
      expect(component.form.get('username')?.hasError('required')).toBe(true);
      expect(component.form.get('password')?.hasError('required')).toBe(true);
    });

    it('should initialize state variables', () => {
      expect(component.loading).toBe(false);
      expect(component.error).toBe('');
      expect(component.success).toBe('');
      expect(component.showPassword).toBe(false);
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty form', () => {
      component.submit();
      expect(component.error).toBe('Please fill in all required fields');
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should show error when username is empty', () => {
      component.form.patchValue({ password: 'test123' });
      component.submit();
      expect(component.error).toBe('Please fill in all required fields');
    });

    it('should show error when password is empty', () => {
      component.form.patchValue({ username: 'admin' });
      component.submit();
      expect(component.error).toBe('Please fill in all required fields');
    });

    it('should allow submission with valid form', () => {
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'admin', role: 'admin' } }));
      
      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();
      
      expect(mockAuthService.login).toHaveBeenCalledWith('admin', 'pass');
    });
  });

  describe('Successful Login', () => {
    it('should navigate to dashboard on success', fakeAsync(() => {
      const mockResponse = { token: 'test-token', user: { username: 'admin', role: 'admin' } };
      mockAuthService.login.and.returnValue(of(mockResponse));

      component.form.patchValue({ username: 'admin', password: 'password' });
      component.submit();
      tick();

      expect(component.success).toBe('Authentication successful');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(component.loading).toBe(false);
    }));

    it('should clear error on successful login', fakeAsync(() => {
      component.error = 'Previous error';
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'user', role: 'user' } }));

      component.form.patchValue({ username: 'user', password: 'pass' });
      component.submit();
      tick();

      expect(component.error).toBe('');
    }));

    it('should set loading state during login', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'admin', role: 'admin' } }).pipe(delay(100)));

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();

      expect(component.loading).toBe(true);
      tick(100);
      expect(component.loading).toBe(false);
    }));
  });

  describe('Login Errors', () => {
    it('should handle simple string error', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ error: 'Invalid credentials' })));

      component.form.patchValue({ username: 'wrong', password: 'wrong' });
      component.submit();
      tick();

      expect(component.error).toBe('Invalid credentials');
      expect(component.loading).toBe(false);
    }));

    it('should handle quoted string error', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ error: '"Invalid credentials"' })));

      component.form.patchValue({ username: 'wrong', password: 'wrong' });
      component.submit();
      tick();

      expect(component.error).toBe('Invalid credentials');
    }));

    it('should handle error object with message', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        error: { message: 'Authentication failed' } 
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('Authentication failed');
    }));

    it('should handle error object with msg property', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        error: { msg: 'Login failed' } 
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('Login failed');
    }));

    it('should handle nested error property', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        error: { error: 'Nested error message' } 
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('Nested error message');
    }));

    it('should handle error with statusText', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        status: 500,
        statusText: 'Internal Server Error',
        error: null
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('500 Internal Server Error');
    }));

    it('should handle error with top-level message', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        message: 'Network error occurred' 
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('Network error occurred');
    }));

    it('should extract "Invalid credentials" from message', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        message: 'Http failure response: Invalid credentials detected' 
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toContain('Invalid credentials');
    }));

    it('should handle timeout errors', fakeAsync(() => {
      mockAuthService.login.and.returnValue(
        of({ token: 'token', user: { username: 'admin', role: 'admin' } }).pipe(delay(11000))
      );

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();
      tick(10000);

      expect(component.error).toBe('Request timed out. Please try again.');
      expect(component.loading).toBe(false);
    }));

    it('should handle unknown error format', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({})));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('Unable to sign in');
    }));

    it('should truncate very long error messages', fakeAsync(() => {
      const longError = 'x'.repeat(250);
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        message: longError 
      })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(component.error).toContain('...');
    }));

    it('should handle null error', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => null));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component.error).toBe('Unable to sign in');
    }));
  });

  describe('Password Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);
      
      component.togglePassword();
      expect(component.showPassword).toBe(true);
      
      component.togglePassword();
      expect(component.showPassword).toBe(false);
    });

    it('should toggle multiple times', () => {
      for (let i = 0; i < 5; i++) {
        component.togglePassword();
        expect(component.showPassword).toBe(i % 2 === 0);
      }
    });
  });

  describe('Loading State', () => {
    it('should clear loading state on success', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'admin', role: 'admin' } }));

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();
      
      expect(component.loading).toBe(true);
      tick();
      expect(component.loading).toBe(false);
    }));

    it('should clear loading state on error', fakeAsync(() => {
      mockAuthService.login.and.returnValue(throwError(() => ({ error: 'Error' })));

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();
      
      expect(component.loading).toBe(true);
      tick();
      expect(component.loading).toBe(false);
    }));

    it('should prevent multiple simultaneous submissions', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'admin', role: 'admin' } }).pipe(delay(100)));

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();
      component.submit(); // Second call while loading

      tick(100);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Message Clearing', () => {
    it('should clear previous messages on new submission', fakeAsync(() => {
      component.error = 'Old error';
      component.success = 'Old success';
      
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'admin', role: 'admin' } }));

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();

      expect(component.error).toBe('');
      expect(component.success).toBe('');
      tick();
    }));
  });

  describe('Change Detection', () => {
    it('should trigger change detection on error', fakeAsync(() => {
      spyOn(component['cdr'], 'detectChanges');
      mockAuthService.login.and.returnValue(throwError(() => ({ error: 'Error' })));

      component.form.patchValue({ username: 'test', password: 'test' });
      component.submit();
      tick();

      expect(component['cdr'].detectChanges).toHaveBeenCalled();
    }));

    it('should trigger change detection on success', fakeAsync(() => {
      spyOn(component['cdr'], 'detectChanges');
      mockAuthService.login.and.returnValue(of({ token: 'token', user: { username: 'admin', role: 'admin' } }));

      component.form.patchValue({ username: 'admin', password: 'pass' });
      component.submit();
      tick();

      expect(component['cdr'].detectChanges).toHaveBeenCalled();
    }));
  });

  describe('Remember Me', () => {
    it('should include remember value in form', () => {
      component.form.patchValue({ remember: true });
      expect(component.form.value.remember).toBe(true);
    });

    it('should default remember to false', () => {
      expect(component.form.value.remember).toBe(false);
    });
  });
});
