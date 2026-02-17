import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { WsService } from '../services/ws.service';
import { AuthService } from '../services/auth.service';
import { ThreatService } from '../services/threat.service';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let mockWsService: jasmine.SpyObj<WsService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockThreatService: jasmine.SpyObj<ThreatService>;
  let messagesSubject: BehaviorSubject<any[]>;

  beforeEach(async () => {
    messagesSubject = new BehaviorSubject<any[]>([]);
    
    mockWsService = jasmine.createSpyObj('WsService', [
      'connect', 'disconnect', 'deleteMessage', 'clearAll', 'requestClearAll'
    ]);
    Object.defineProperty(mockWsService, 'messages$', { get: () => messagesSubject.asObservable() });

    mockAuthService = jasmine.createSpyObj('AuthService', ['isAdmin', 'logout']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockThreatService = jasmine.createSpyObj('ThreatService', ['reportThreat']);

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, ReactiveFormsModule],
      providers: [
        { provide: WsService, useValue: mockWsService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ThreatService, useValue: mockThreatService }
      ]
    }).compileComponents();

    mockAuthService.isAdmin.and.returnValue(true);
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should redirect non-admin users', () => {
      mockAuthService.isAdmin.and.returnValue(false);
      component.ngOnInit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });

    it('should connect to WebSocket for admin users', () => {
      component.ngOnInit();
      expect(mockWsService.connect).toHaveBeenCalled();
    });

    it('should subscribe to messages', fakeAsync(() => {
      component.ngOnInit();
      messagesSubject.next([{ id: '1', data: 'test' }]);
      tick();
      expect(component.messages.length).toBe(1);
    }));

    it('should initialize form with default values', () => {
      fixture.detectChanges();
      expect(component.form.value).toEqual({
        type: 'intrusion',
        severity: 'medium',
        sourceIp: '',
        targetIp: '',
        description: ''
      });
    });

    it('should limit messages to 50', fakeAsync(() => {
      component.ngOnInit();
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({ id: `${i}`, data: `msg${i}` }));
      messagesSubject.next(manyMessages);
      tick();
      expect(component.messages.length).toBe(50);
    }));
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      component.ngOnInit();
      const sub = component['sub'];
      spyOn(sub!, 'unsubscribe');
      component.ngOnDestroy();
      expect(sub!.unsubscribe).toHaveBeenCalled();
    });

    it('should disconnect WebSocket on destroy', () => {
      component.ngOnInit();
      component.ngOnDestroy();
      expect(mockWsService.disconnect).toHaveBeenCalled();
    });

    it('should handle destroy without initialization', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('IP Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should accept valid IPv4 addresses', () => {
      const validIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '255.255.255.255', '0.0.0.0'];
      
      validIps.forEach(ip => {
        component.form.patchValue({ sourceIp: ip });
        expect(component.form.get('sourceIp')?.hasError('ip')).toBe(false);
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = ['256.1.1.1', '192.168.1', '192.168.1.1.1', 'abc.def.ghi.jkl', '192.168.-1.1'];
      
      invalidIps.forEach(ip => {
        component.form.patchValue({ sourceIp: ip });
        expect(component.form.get('sourceIp')?.hasError('ip')).toBe(true);
      });
    });

    it('should handle edge case IPs', () => {
      component.form.patchValue({ sourceIp: '192.168.001.001' });
      expect(component.form.get('sourceIp')?.hasError('ip')).toBe(false);
    });

    it('should allow empty targetIp', () => {
      component.form.patchValue({ targetIp: '' });
      expect(component.form.get('targetIp')?.hasError('ip')).toBe(false);
    });

    it('should validate targetIp when provided', () => {
      component.form.patchValue({ targetIp: '192.168.1.1' });
      expect(component.form.get('targetIp')?.hasError('ip')).toBe(false);

      component.form.patchValue({ targetIp: 'invalid' });
      expect(component.form.get('targetIp')?.hasError('ip')).toBe(true);
    });

    it('should trim whitespace from IPs', () => {
      component.form.patchValue({ sourceIp: '  192.168.1.1  ' });
      expect(component.form.get('sourceIp')?.hasError('ip')).toBe(false);
    });
  });

  describe('Description Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require minimum 10 characters', () => {
      component.form.patchValue({ description: 'short' });
      expect(component.form.get('description')?.hasError('minlength')).toBe(true);

      component.form.patchValue({ description: 'This is a valid description' });
      expect(component.form.get('description')?.hasError('minlength')).toBe(false);
    });

    it('should enforce maximum 500 characters', () => {
      const longText = 'x'.repeat(501);
      component.form.patchValue({ description: longText });
      expect(component.form.get('description')?.hasError('maxlength')).toBe(true);

      const validText = 'x'.repeat(500);
      component.form.patchValue({ description: validText });
      expect(component.form.get('description')?.hasError('maxlength')).toBe(false);
    });

    it('should require description', () => {
      component.form.patchValue({ description: '' });
      expect(component.form.get('description')?.hasError('required')).toBe(true);
    });
  });

  describe('Threat Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should submit valid threat', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'threat-123' }));

      component.form.patchValue({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'Malware detected on endpoint'
      });

      component.submitThreat();
      tick();

      expect(mockThreatService.reportThreat).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          targetIp: '10.0.0.1',
          description: 'Malware detected on endpoint'
        })
      );
      expect(component.formSuccess).toContain('threat-123');
      expect(component.submitting).toBe(false);
    }));

    it('should include metadata with Bogota timestamp', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'threat-123' }));

      component.form.patchValue({
        type: 'intrusion',
        severity: 'medium',
        sourceIp: '192.168.1.1',
        description: 'Intrusion attempt detected'
      });

      component.submitThreat();
      tick();

      const call = mockThreatService.reportThreat.calls.mostRecent();
      expect(call.args[0].metadata).toBeDefined();
      expect(call.args[0].metadata.reportedAtTz).toBe('America/Bogota');
      expect(call.args[0].metadata.reportedAtLocal).toBeDefined();
    }));

    it('should not submit invalid form', () => {
      component.form.patchValue({
        sourceIp: 'invalid',
        description: 'short'
      });

      component.submitThreat();

      expect(mockThreatService.reportThreat).not.toHaveBeenCalled();
      expect(component.formError).toContain('review');
    });

    it('should mark all fields as touched on invalid submission', () => {
      component.submitThreat();
      
      expect(component.form.get('sourceIp')?.touched).toBe(true);
      expect(component.form.get('description')?.touched).toBe(true);
    });

    it('should show specific invalid fields in error', () => {
      component.form.patchValue({
        type: 'malware',
        severity: 'high',
        sourceIp: 'invalid',
        description: 'short'
      });

      component.submitThreat();

      expect(component.formError).toContain('Source IP');
      expect(component.formError).toContain('Description');
    });

    it('should reset form after successful submission', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'threat-123' }));

      component.form.patchValue({
        type: 'phishing',
        severity: 'critical',
        sourceIp: '192.168.1.50',
        targetIp: '10.0.0.5',
        description: 'Phishing email detected'
      });

      component.submitThreat();
      tick();

      expect(component.form.value).toEqual({
        type: 'intrusion',
        severity: 'medium',
        sourceIp: '',
        targetIp: '',
        description: ''
      });
    }));

    it('should handle submission errors', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(
        throwError(() => ({ error: { message: 'Validation failed' } }))
      );

      component.form.patchValue({
        type: 'ddos',
        severity: 'high',
        sourceIp: '192.168.1.1',
        description: 'DDoS attack detected'
      });

      component.submitThreat();
      tick();

      expect(component.formError).toBe('Validation failed');
      expect(component.submitting).toBe(false);
    }));

    it('should handle undefined targetIp', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'threat-123' }));

      component.form.patchValue({
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '192.168.1.1',
        targetIp: '',
        description: 'Ransomware encryption detected'
      });

      component.submitThreat();
      tick();

      const call = mockThreatService.reportThreat.calls.mostRecent();
      expect(call.args[0].targetIp).toBeUndefined();
    }));

    it('should set submitting state during submission', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'threat-123' }));

      component.form.patchValue({
        type: 'intrusion',
        severity: 'medium',
        sourceIp: '192.168.1.1',
        description: 'Test intrusion'
      });

      component.submitThreat();
      expect(component.submitting).toBe(true);
      
      tick();
      expect(component.submitting).toBe(false);
    }));

    it('should clear previous messages on new submission', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'threat-123' }));
      
      component.formError = 'Old error';
      component.formSuccess = 'Old success';

      component.form.patchValue({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.1',
        description: 'Malware detected'
      });

      component.submitThreat();
      
      expect(component.formError).toBe('');
      expect(component.formSuccess).toBe('');
      tick();
    }));

    it('should handle response without threatId', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(of({ success: true }));

      component.form.patchValue({
        type: 'intrusion',
        severity: 'low',
        sourceIp: '192.168.1.1',
        description: 'Minor intrusion attempt'
      });

      component.submitThreat();
      tick();

      expect(component.formSuccess).toBe('Report submitted.');
    }));
  });

  describe('Error Message Extraction', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should extract string error', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(
        throwError(() => ({ error: 'Simple error message' }))
      );

      component.form.patchValue({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.1',
        description: 'Test malware'
      });

      component.submitThreat();
      tick();

      expect(component.formError).toBe('Simple error message');
    }));

    it('should extract nested error.error', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(
        throwError(() => ({ error: { error: 'Nested error' } }))
      );

      component.form.patchValue({
        type: 'phishing',
        severity: 'medium',
        sourceIp: '192.168.1.1',
        description: 'Test phishing'
      });

      component.submitThreat();
      tick();

      expect(component.formError).toBe('Nested error');
    }));

    it('should extract error.message', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(
        throwError(() => ({ error: { message: 'Error message' } }))
      );

      component.form.patchValue({
        type: 'ddos',
        severity: 'critical',
        sourceIp: '192.168.1.1',
        description: 'Test DDoS'
      });

      component.submitThreat();
      tick();

      expect(component.formError).toBe('Error message');
    }));

    it('should handle null error', fakeAsync(() => {
      mockThreatService.reportThreat.and.returnValue(throwError(() => null));

      component.form.patchValue({
        type: 'intrusion',
        severity: 'low',
        sourceIp: '192.168.1.1',
        description: 'Test intrusion'
      });

      component.submitThreat();
      tick();

      expect(component.formError).toBe('Unable to submit the report.');
    }));
  });

  describe('Message Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('should delete message by index', () => {
      component.deleteMessage(0);
      expect(mockWsService.deleteMessage).toHaveBeenCalledWith(0);
    });

    it('should clear all messages with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.clearAll();
      
      expect(mockWsService.requestClearAll).toHaveBeenCalled();
      expect(mockWsService.clearAll).toHaveBeenCalled();
    });

    it('should not clear messages without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.clearAll();
      
      expect(mockWsService.requestClearAll).not.toHaveBeenCalled();
      expect(mockWsService.clearAll).not.toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should logout and navigate to login', () => {
      component.logout();
      
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });
  });

  describe('Form Controls', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should get form control by name', () => {
      const control = component.getControl('sourceIp');
      expect(control).toBeTruthy();
      expect(control).toBe(component.form.get('sourceIp'));
    });

    it('should return null for non-existent control', () => {
      const control = component.getControl('nonExistent');
      expect(control).toBeNull();
    });
  });

  describe('Threat Types', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should accept all threat types', fakeAsync(() => {
      const types = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'test' }));

      types.forEach(type => {
        component.form.patchValue({
          type,
          severity: 'medium',
          sourceIp: '192.168.1.1',
          description: `Test ${type} threat`
        });

        component.submitThreat();
        tick();

        expect(mockThreatService.reportThreat).toHaveBeenCalledWith(
          jasmine.objectContaining({ type })
        );
      });
    }));
  });

  describe('Severity Levels', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should accept all severity levels', fakeAsync(() => {
      const severities = ['low', 'medium', 'high', 'critical'];
      mockThreatService.reportThreat.and.returnValue(of({ threatId: 'test' }));

      severities.forEach(severity => {
        component.form.patchValue({
          type: 'intrusion',
          severity,
          sourceIp: '192.168.1.1',
          description: `Test ${severity} severity`
        });

        component.submitThreat();
        tick();

        expect(mockThreatService.reportThreat).toHaveBeenCalledWith(
          jasmine.objectContaining({ severity })
        );
      });
    }));
  });
});
