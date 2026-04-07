import { describe, it, expect, beforeEach, afterEach, beforeAll} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { UserAdminRepositoryImpl } from '../user-admin-repository.impl';


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('UserAdminRepositoryImpl', () => {
  let repository: UserAdminRepositoryImpl;
  let httpController: HttpTestingController;

  const API_URL = 'http://localhost:3000/api/admin/users';

  const mockUser = {
    id: 'u1', uid: 'uid1', username: 'alice', email: 'alice@test.com',
    fullName: 'Alice', role: 'admin', isActive: true,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [UserAdminRepositoryImpl, provideHttpClient(), provideHttpClientTesting()],
    });
    repository    = TestBed.inject(UserAdminRepositoryImpl);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpController.verify(); });

  describe('getUsers()', () => {
    it('should GET /api/admin/users and return user list', async () => {
      const mockResponse = { users: [mockUser], total: 1 };
      const promise = firstValueFrom(repository.getUsers());

      const req = httpController.expectOne(API_URL);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const result = await promise;
      expect(result.total).toBe(1);
      expect(result.users[0].username).toBe('alice');
    });
  });

  describe('getUserById()', () => {
    it('should GET /api/admin/users/:id', async () => {
      const promise = firstValueFrom(repository.getUserById('u1'));

      const req = httpController.expectOne(`${API_URL}/u1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);

      const result = await promise;
      expect(result.id).toBe('u1');
    });
  });

  describe('createUser()', () => {
    it('should POST /api/admin/users with request body', async () => {
      const createRequest = { email: 'new@test.com', fullName: 'New User', username: 'newuser', role: 'soc_analyst' };
      const mockCreated   = { ...mockUser, id: 'u-new', username: 'newuser', email: 'new@test.com', role: 'soc_analyst' };
      const promise = firstValueFrom(repository.createUser(createRequest));

      const req = httpController.expectOne(API_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush({ success: true, user: mockCreated });

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('new@test.com');
    });
  });

  describe('updateUser()', () => {
    it('should PUT /api/admin/users/:id with update body', async () => {
      const updateRequest = { fullName: 'Alice Updated', role: 'incident_handler' };
      const mockUpdated   = { ...mockUser, fullName: 'Alice Updated', role: 'incident_handler' };
      const promise = firstValueFrom(repository.updateUser('u1', updateRequest));

      const req = httpController.expectOne(`${API_URL}/u1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush({ success: true, user: mockUpdated });

      const result = await promise;
      expect(result.user.role).toBe('incident_handler');
    });
  });

  describe('toggleUserStatus()', () => {
    it('should PATCH /api/admin/users/:id/status with isActive payload', async () => {
      const mockDeactivated = { ...mockUser, isActive: false };
      const promise = firstValueFrom(repository.toggleUserStatus('u1', { isActive: false }));

      const req = httpController.expectOne(`${API_URL}/u1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({ success: true, user: mockDeactivated, reassignedIncidents: 2 });

      const result = await promise;
      expect(result.user.isActive).toBe(false);
      expect(result.reassignedIncidents).toBe(2);
    });

    it('should PATCH with isActive=true when activating', async () => {
      const promise = firstValueFrom(repository.toggleUserStatus('u1', { isActive: true }));

      const req = httpController.expectOne(`${API_URL}/u1/status`);
      expect(req.request.body).toEqual({ isActive: true });
      req.flush({ success: true, user: mockUser, reassignedIncidents: 0 });

      const result = await promise;
      expect(result.user.isActive).toBe(true);
    });
  });
});
