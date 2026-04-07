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
import { ListThreatsUseCase } from '../../../../application/use-cases/ListThreatsUseCase';
import { DeleteThreatUseCase } from '../../../../application/use-cases/DeleteThreatUseCase';
import { ThreatClassifier } from '../../../../domain/services/ThreatClassifier';
import { CreateIncidentUseCase } from '../../../../application/use-cases/CreateIncidentUseCase';
import { ListIncidentsUseCase } from '../../../../application/use-cases/ListIncidentsUseCase';


describe('ServiceFactory - Singleton Pattern & Dependency Injection', () => {
  
  beforeEach(() => {
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

  // ── Additional factory methods – singleton pattern & reset ────────────────

  describe('Remaining Factory Methods', () => {
    beforeEach(() => {
      ServiceFactory.resetForTesting();
    });

    describe('getThreatRepository()', () => {
      it('should create and return a repository instance', () => {
        const repo = ServiceFactory.getThreatRepository();
        expect(repo).toBeDefined();
      });

      it('should return same instance on multiple calls (Singleton)', () => {
        const repo1 = ServiceFactory.getThreatRepository();
        const repo2 = ServiceFactory.getThreatRepository();
        expect(repo1).toBe(repo2);
      });
    });

    describe('getListThreatsUseCase()', () => {
      it('should create and return a ListThreatsUseCase instance', () => {
        const uc = ServiceFactory.getListThreatsUseCase();
        expect(uc).toBeDefined();
        expect(uc).toBeInstanceOf(ListThreatsUseCase);
      });

      it('should return same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getListThreatsUseCase();
        const uc2 = ServiceFactory.getListThreatsUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getDeleteThreatUseCase()', () => {
      it('should create and return a DeleteThreatUseCase instance', () => {
        const uc = ServiceFactory.getDeleteThreatUseCase();
        expect(uc).toBeDefined();
        expect(uc).toBeInstanceOf(DeleteThreatUseCase);
      });

      it('should return same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getDeleteThreatUseCase();
        const uc2 = ServiceFactory.getDeleteThreatUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getUserRepository()', () => {
      it('should create and return a user repository instance', () => {
        const repo = ServiceFactory.getUserRepository();
        expect(repo).toBeDefined();
      });

      it('should return same instance on multiple calls (Singleton)', () => {
        const repo1 = ServiceFactory.getUserRepository();
        const repo2 = ServiceFactory.getUserRepository();
        expect(repo1).toBe(repo2);
      });
    });

    describe('getAuditLogRepository()', () => {
      it('should create and return an audit log repository instance', () => {
        const repo = ServiceFactory.getAuditLogRepository();
        expect(repo).toBeDefined();
      });

      it('should return same instance on multiple calls (Singleton)', () => {
        const repo1 = ServiceFactory.getAuditLogRepository();
        const repo2 = ServiceFactory.getAuditLogRepository();
        expect(repo1).toBe(repo2);
      });
    });

    describe('getThreatClassifier()', () => {
      it('should create and return a ThreatClassifier instance', () => {
        const classifier = ServiceFactory.getThreatClassifier();
        expect(classifier).toBeDefined();
        expect(classifier).toBeInstanceOf(ThreatClassifier);
      });

      it('should return same instance on multiple calls (Singleton)', () => {
        const classifier1 = ServiceFactory.getThreatClassifier();
        const classifier2 = ServiceFactory.getThreatClassifier();
        expect(classifier1).toBe(classifier2);
      });
    });

    describe('getStatisticsUseCase()', () => {
      it('should return a use case instance (no caching)', () => {
        const uc1 = ServiceFactory.getStatisticsUseCase();
        const uc2 = ServiceFactory.getStatisticsUseCase();
        expect(uc1).toBeDefined();
        expect(uc2).toBeDefined();
      });
    });

    describe('getIncidentRepository()', () => {
      it('should create and return a repository instance', () => {
        const repo = ServiceFactory.getIncidentRepository();
        expect(repo).toBeDefined();
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const repo1 = ServiceFactory.getIncidentRepository();
        const repo2 = ServiceFactory.getIncidentRepository();
        expect(repo1).toBe(repo2);
      });
    });

    describe('getCreateUserUseCase()', () => {
      it('should create and return a use case instance', () => {
        const uc = ServiceFactory.getCreateUserUseCase();
        expect(uc).toBeDefined();
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getCreateUserUseCase();
        const uc2 = ServiceFactory.getCreateUserUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getUpdateUserUseCase()', () => {
      it('should create and return a use case instance', () => {
        const uc = ServiceFactory.getUpdateUserUseCase();
        expect(uc).toBeDefined();
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getUpdateUserUseCase();
        const uc2 = ServiceFactory.getUpdateUserUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getToggleUserStatusUseCase()', () => {
      it('should create and return a use case instance', () => {
        const uc = ServiceFactory.getToggleUserStatusUseCase();
        expect(uc).toBeDefined();
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getToggleUserStatusUseCase();
        const uc2 = ServiceFactory.getToggleUserStatusUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getListUsersUseCase()', () => {
      it('should create and return a use case instance', () => {
        const uc = ServiceFactory.getListUsersUseCase();
        expect(uc).toBeDefined();
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getListUsersUseCase();
        const uc2 = ServiceFactory.getListUsersUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getCreateIncidentUseCase()', () => {
      it('should create and return a CreateIncidentUseCase instance', () => {
        const uc = ServiceFactory.getCreateIncidentUseCase();
        expect(uc).toBeDefined();
        expect(uc).toBeInstanceOf(CreateIncidentUseCase);
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getCreateIncidentUseCase();
        const uc2 = ServiceFactory.getCreateIncidentUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('getListIncidentsUseCase()', () => {
      it('should create and return a ListIncidentsUseCase instance', () => {
        const uc = ServiceFactory.getListIncidentsUseCase();
        expect(uc).toBeDefined();
        expect(uc).toBeInstanceOf(ListIncidentsUseCase);
      });

      it('should return the same instance on multiple calls (Singleton)', () => {
        const uc1 = ServiceFactory.getListIncidentsUseCase();
        const uc2 = ServiceFactory.getListIncidentsUseCase();
        expect(uc1).toBe(uc2);
      });
    });

    describe('resetForTesting()', () => {
      it('should reset all cached instances so next call creates new ones', () => {
        const threat1      = ServiceFactory.getThreatRepository();
        const list1        = ServiceFactory.getListThreatsUseCase();
        const del1         = ServiceFactory.getDeleteThreatUseCase();
        const user1        = ServiceFactory.getUserRepository();
        const audit1       = ServiceFactory.getAuditLogRepository();
        const classify1    = ServiceFactory.getThreatClassifier();
        const incident1    = ServiceFactory.getIncidentRepository();
        const createUser1  = ServiceFactory.getCreateUserUseCase();
        const updateUser1  = ServiceFactory.getUpdateUserUseCase();
        const toggleUser1  = ServiceFactory.getToggleUserStatusUseCase();
        const listUsers1   = ServiceFactory.getListUsersUseCase();
        const createInc1   = ServiceFactory.getCreateIncidentUseCase();
        const listInc1     = ServiceFactory.getListIncidentsUseCase();

        ServiceFactory.resetForTesting();

        const threat2      = ServiceFactory.getThreatRepository();
        const list2        = ServiceFactory.getListThreatsUseCase();
        const del2         = ServiceFactory.getDeleteThreatUseCase();
        const user2        = ServiceFactory.getUserRepository();
        const audit2       = ServiceFactory.getAuditLogRepository();
        const classify2    = ServiceFactory.getThreatClassifier();
        const incident2    = ServiceFactory.getIncidentRepository();
        const createUser2  = ServiceFactory.getCreateUserUseCase();
        const updateUser2  = ServiceFactory.getUpdateUserUseCase();
        const toggleUser2  = ServiceFactory.getToggleUserStatusUseCase();
        const listUsers2   = ServiceFactory.getListUsersUseCase();
        const createInc2   = ServiceFactory.getCreateIncidentUseCase();
        const listInc2     = ServiceFactory.getListIncidentsUseCase();

        expect(threat1).not.toBe(threat2);
        expect(list1).not.toBe(list2);
        expect(del1).not.toBe(del2);
        expect(user1).not.toBe(user2);
        expect(audit1).not.toBe(audit2);
        expect(classify1).not.toBe(classify2);
        expect(incident1).not.toBe(incident2);
        expect(createUser1).not.toBe(createUser2);
        expect(updateUser1).not.toBe(updateUser2);
        expect(toggleUser1).not.toBe(toggleUser2);
        expect(listUsers1).not.toBe(listUsers2);
        expect(createInc1).not.toBe(createInc2);
        expect(listInc1).not.toBe(listInc2);
      });
    });
  });
});