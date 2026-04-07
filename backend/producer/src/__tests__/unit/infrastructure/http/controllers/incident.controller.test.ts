import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.mock('../../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));

type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const mockCreateExecute  = jest.fn<AsyncFn>();
const mockListExecute    = jest.fn<AsyncFn>();
const mockFindById       = jest.fn<AsyncFn>();

jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getCreateIncidentUseCase: jest.fn(() => ({ execute: mockCreateExecute })),
    getListIncidentsUseCase:  jest.fn(() => ({ execute: mockListExecute })),
    getIncidentRepository:    jest.fn(() => ({ findById: mockFindById })),
  },
}));

jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn(),
}));

import incidentRouter from '../../../../../infrastructure/http/controllers/incident.controller';
import { authMiddleware } from '../../../../../infrastructure/http/middlewares/auth.middleware';
import {
  ThreatNotFoundForIncidentError,
  InvalidIncidentCreationError,
  DuplicateIncidentError,
} from '../../../../../domain/exceptions/IrmsExceptions';
import { IncidentStatus } from '../../../../../domain/value-objects/IncidentStatus';

// ── Auth helper ───────────────────────────────────────────────────────────────
const mockAuth = authMiddleware as jest.MockedFunction<
  (req: Request, res: Response, next: NextFunction) => void
>;

function makeApp(role = 'soc_analyst', id = 'user-uuid-1'): Express {
  const app = express();
  app.use(express.json());
  mockAuth.mockImplementation((req, _res, next) => {
    (req as Request & { user: { id: string; role: string } }).user = { id, role };
    next();
  });
  app.use('/incidents', incidentRouter);
  return app;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const savedIncident = {
  id:          'incident-uuid-1',
  threatId:    'threat-uuid-1',
  title:       'malware desde 192.168.1.1',
  status:      IncidentStatus.OPEN,
  severity:    'high',
  type:        'malware',
  sourceIp:    '192.168.1.1',
  description: 'Malware detected',
  createdBy:   'user-uuid-1',
  assignedTo:  null,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
};

// ─────────────────────────────────────────────────────────────────────────────

describe('incident.controller (IRMS — HU-001)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /incidents ──────────────────────────────────────────────────────────

  describe('POST /incidents', () => {
    it('should return 201 with incident on successful creation (soc_analyst)', async () => {
      mockCreateExecute.mockResolvedValueOnce({ incident: savedIncident } as never);

      const res = await request(makeApp('soc_analyst'))
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.incident.id).toBe(savedIncident.id);
    });

    it('should return 201 when created by an admin', async () => {
      mockCreateExecute.mockResolvedValueOnce({ incident: savedIncident } as never);

      const res = await request(makeApp('admin'))
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(201);
    });

    it('should return 400 when threatId is missing', async () => {
      const res = await request(makeApp())
        .post('/incidents')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when threatId is not a UUID', async () => {
      const res = await request(makeApp())
        .post('/incidents')
        .send({ threatId: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });

    it('should return 403 when role is incident_responder', async () => {
      const res = await request(makeApp('incident_responder'))
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should return 403 when role is viewer', async () => {
      const res = await request(makeApp('viewer'))
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(403);
    });

    it('should return 404 when threat does not exist (ThreatNotFoundForIncidentError)', async () => {
      mockCreateExecute.mockRejectedValueOnce(
        new ThreatNotFoundForIncidentError('threat-uuid-1') as never,
      );

      const res = await request(makeApp())
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('should return 422 when severity is too low (InvalidIncidentCreationError)', async () => {
      mockCreateExecute.mockRejectedValueOnce(
        new InvalidIncidentCreationError('threat-uuid-1', 'medium') as never,
      );

      const res = await request(makeApp())
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(422);
    });

    it('should return 409 when duplicate active incident exists (DuplicateIncidentError)', async () => {
      mockCreateExecute.mockRejectedValueOnce(
        new DuplicateIncidentError('threat-uuid-1') as never,
      );

      const res = await request(makeApp())
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(409);
    });

    it('should return 500 on unexpected errors', async () => {
      mockCreateExecute.mockRejectedValueOnce(new Error('DB down') as never);

      const res = await request(makeApp())
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create incident');
    });

    it('should pass threatId and createdBy to the use case', async () => {
      mockCreateExecute.mockResolvedValueOnce({ incident: savedIncident } as never);

      await request(makeApp('soc_analyst', 'user-abc'))
        .post('/incidents')
        .send({ threatId: 'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          threatId:  'aebc3f8d-4c2e-4e9f-a1d1-0f1234567890',
          createdBy: 'user-abc',
        }),
      );
    });
  });

  // ── GET /incidents ───────────────────────────────────────────────────────────

  describe('GET /incidents', () => {
    it('should return 200 with incidents list', async () => {
      mockListExecute.mockResolvedValueOnce({ incidents: [savedIncident], total: 1 } as never);

      const res = await request(makeApp()).get('/incidents');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.incidents).toHaveLength(1);
    });

    it('should return 200 with empty list when no incidents exist', async () => {
      mockListExecute.mockResolvedValueOnce({ incidents: [], total: 0 } as never);

      const res = await request(makeApp()).get('/incidents');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it('should pass status query param as filter', async () => {
      mockListExecute.mockResolvedValueOnce({ incidents: [], total: 0 } as never);

      await request(makeApp()).get('/incidents?status=open');

      expect(mockListExecute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open' }),
      );
    });

    it('should pass severity query param as filter', async () => {
      mockListExecute.mockResolvedValueOnce({ incidents: [], total: 0 } as never);

      await request(makeApp()).get('/incidents?severity=high');

      expect(mockListExecute).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'high' }),
      );
    });

    it('should pass both query params as filters', async () => {
      mockListExecute.mockResolvedValueOnce({ incidents: [], total: 0 } as never);

      await request(makeApp()).get('/incidents?status=assigned&severity=critical');

      expect(mockListExecute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'assigned', severity: 'critical' }),
      );
    });

    it('should return 500 on unexpected errors', async () => {
      mockListExecute.mockRejectedValueOnce(new Error('DB error') as never);

      const res = await request(makeApp()).get('/incidents');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve incidents');
    });
  });

  // ── GET /incidents/:id ───────────────────────────────────────────────────────

  describe('GET /incidents/:id', () => {
    it('should return 200 with the incident when found', async () => {
      mockFindById.mockResolvedValueOnce(savedIncident as never);

      const res = await request(makeApp()).get('/incidents/incident-uuid-1');

      expect(res.status).toBe(200);
      expect(res.body.incident.id).toBe(savedIncident.id);
    });

    it('should return 404 when incident does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null as never);

      const res = await request(makeApp()).get('/incidents/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('nonexistent-id');
    });

    it('should call findById with the route param id', async () => {
      mockFindById.mockResolvedValueOnce(savedIncident as never);

      await request(makeApp()).get('/incidents/incident-uuid-1');

      expect(mockFindById).toHaveBeenCalledWith('incident-uuid-1');
    });

    it('should return 500 on unexpected errors', async () => {
      mockFindById.mockRejectedValueOnce(new Error('DB error') as never);

      const res = await request(makeApp()).get('/incidents/some-id');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve incident');
    });
  });
});
