import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock config before imports
jest.mock('../../../../infrastructure/config/env', () => ({
  config: {
    firebaseApiKey: 'test-api-key',
    firebaseAuthDomain: 'test-auth-domain.firebaseapp.com',
    firebaseProjectId: 'test-project-id'
  }
}));

import { ServiceFactory } from '../../../../infrastructure/factories/ServiceFactory';
import { AuthService } from '../../../../application/services/AuthService';
import { ThreatService } from '../../../../application/services/threat.service';


describe('ServiceFactory - Singleton Pattern & Dependency Injection', () => {
  
  beforeEach(() => {
    // Reset singleton instances  between tests
    // @ts-ignore - accessing private property for testing
    ServiceFactory.threatService = null;
    // @ts-ignore - accessing private property for testing
    ServiceFactory.authService = null;
  });

    describe('getThreatService()', () => {
        
        it('should create and return a ThreatService instance', () => {
        const service = ServiceFactory.getThreatService();

        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(ThreatService);
        expect(typeof service.reportThreat).toBe('function');
        });

        it('should return the same instance on multiple calls (Singleton)', () => {
        const service1 = ServiceFactory.getThreatService();
        const service2 = ServiceFactory.getThreatService();
        const service3 = ServiceFactory.getThreatService();

        expect(service1).toBe(service2);
        expect(service2).toBe(service3);
        });

        it('should reset singleton when instance is manually cleared', () => {
        const service1 = ServiceFactory.getThreatService();
        
        // @ts-ignore - accessing private property for testing
        ServiceFactory.threatService = null;
        
        const service2 = ServiceFactory.getThreatService();

        expect(service1).not.toBe(service2);
        expect(service2).toBeInstanceOf(ThreatService);
        });
    });


    describe('getAuthService()', () => {
    
        it('should create and return an AuthService instance', () => {
            const service = ServiceFactory.getAuthService();

            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(AuthService);
            expect(typeof service.login).toBe('function');
        });
        it('should return the same instance on multiple calls (Singleton)', () => {
            const service1 = ServiceFactory.getAuthService();
            const service2 = ServiceFactory.getAuthService();
            const service3 = ServiceFactory.getAuthService();

            expect(service1).toBe(service2);
            expect(service2).toBe(service3);
        });

        it('should reset singleton when instance is manually cleared', () => {
            const service1 = ServiceFactory.getAuthService();
            
            // @ts-ignore - accessing private property for testing
            ServiceFactory.authService = null;
            
            const service2 = ServiceFactory.getAuthService();

            expect(service1).not.toBe(service2);
            expect(service2).toBeInstanceOf(AuthService);
        });
    });


    describe('Factory Independence', () => {

        
        it('should create independent services without interference', () => {
        const threatService = ServiceFactory.getThreatService();
        const authService = ServiceFactory.getAuthService();

        expect(threatService).toBeDefined();
        expect(authService).toBeDefined();
        expect(threatService).not.toBe(authService);
        expect(threatService).toBeInstanceOf(ThreatService);
        expect(authService).toBeInstanceOf(AuthService);
        });

        it('should maintain singleton independently for each service type', () => {
        const threat1 = ServiceFactory.getThreatService();
        const auth1 = ServiceFactory.getAuthService();
        const threat2 = ServiceFactory.getThreatService();
        const auth2 = ServiceFactory.getAuthService();

        // Each service type returns the same instance
        expect(threat1).toBe(threat2);
        expect(auth1).toBe(auth2);
        
        // But different service types are different instances
        expect(threat1).not.toBe(auth1);
        });

        it('should handle concurrent access without creating duplicate instances', () => {
        const services = Array.from({ length: 10 }, () => 
            ServiceFactory.getThreatService()
        );

        // All references should point to the same instance
        const firstService = services[0];
        services.forEach(service => {
            expect(service).toBe(firstService);
        });
        });
    });

    describe('Factory Reset and Lifecycle', () => {
    
    it('should allow multiple reset cycles', () => {
      const service1 = ServiceFactory.getThreatService();
      
      // @ts-ignore
      ServiceFactory.threatService = null;
      const service2 = ServiceFactory.getThreatService();
      
      // @ts-ignore
      ServiceFactory.threatService = null;
      const service3 = ServiceFactory.getThreatService();

      expect(service1).not.toBe(service2);
      expect(service2).not.toBe(service3);
      expect(service1).not.toBe(service3);
      
      // All are valid instances
      expect(service1).toBeInstanceOf(ThreatService);
      expect(service2).toBeInstanceOf(ThreatService);
      expect(service3).toBeInstanceOf(ThreatService);
    });

    it('should maintain service after multiple calls', () => {
      // Multiple rapid calls
      for (let i = 0; i < 20; i++) {
        ServiceFactory.getThreatService();
        ServiceFactory.getAuthService();
      }

      const threatService = ServiceFactory.getThreatService();
      const authService = ServiceFactory.getAuthService();

      expect(threatService).toBeInstanceOf(ThreatService);
      expect(authService).toBeInstanceOf(AuthService);
    });
  });
});