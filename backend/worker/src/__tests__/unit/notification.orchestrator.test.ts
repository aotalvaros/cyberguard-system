import { NotificationOrchestrator } from '../../infrastructure/notifications/NotificationOrchestrator';
import type { INotificationService, NotifPayload, NotifResult } from '../../domain/ports/INotificationService';

const mockPayload: NotifPayload = {
  eventId: 'evt-orch-01',
  type: 'malware',
  severity: 'high',
  sourceIp: '1.1.1.1',
  description: 'test threat',
  receivedAt: '2026-04-06T00:00:00Z',
  recipientEmail: 'admin@cyberguard.com',
  recipientPhone: '+573001234567',
};

const makeAdapter = (result: Partial<NotifResult>): INotificationService => ({
  send: jest.fn().mockResolvedValue({ attempts: 1, error: undefined, ...result }),
});

const makeFailAdapter = (canal: 'email' | 'whatsapp'): INotificationService => ({
  send: jest.fn().mockResolvedValue({ canal, status: 'error', attempts: 3, error: 'fail' }),
});

describe('NotificationOrchestrator', () => {
  it('should send via email only when emailEnabled=true, whatsappEnabled=false', async () => {
    const email = makeAdapter({ canal: 'email', status: 'success' });
    const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' };
    const results = await orch.dispatch(mockPayload, prefs);
    expect(email.send).toHaveBeenCalledTimes(1);
    expect(wa.send).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]?.canal).toBe('email');
  });

  it('should send via whatsapp only when whatsappEnabled=true, emailEnabled=false', async () => {
    const email = makeAdapter({ canal: 'email', status: 'success' });
    const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: false, whatsappEnabled: true, email: '', phone: '+573001234567' };
    const results = await orch.dispatch(mockPayload, prefs);
    expect(wa.send).toHaveBeenCalledTimes(1);
    expect(email.send).not.toHaveBeenCalled();
    expect(results[0]?.canal).toBe('whatsapp');
  });

  it('should send via both channels when both enabled', async () => {
    const email = makeAdapter({ canal: 'email', status: 'success' });
    const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1234567890' };
    const results = await orch.dispatch(mockPayload, prefs);
    expect(results).toHaveLength(2);
  });

  it('should return empty array when both channels disabled', async () => {
    const email = makeAdapter({ canal: 'email', status: 'success' });
    const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: false, whatsappEnabled: false, email: '', phone: '' };
    const results = await orch.dispatch(mockPayload, prefs);
    expect(results).toHaveLength(0);
    expect(email.send).not.toHaveBeenCalled();
    expect(wa.send).not.toHaveBeenCalled();
  });

  it('should still send whatsapp if email fails', async () => {
    const email = makeFailAdapter('email');
    const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1234567890' };
    const results = await orch.dispatch(mockPayload, prefs);
    expect(results.find(r => r.canal === 'whatsapp')?.status).toBe('success');
  });

  it('should still send email if whatsapp fails', async () => {
    const email = makeAdapter({ canal: 'email', status: 'success' });
    const wa = makeFailAdapter('whatsapp');
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1234567890' };
    const results = await orch.dispatch(mockPayload, prefs);
    expect(results.find(r => r.canal === 'email')?.status).toBe('success');
  });

  it('should NOT throw even if both channels fail', async () => {
    const email = makeFailAdapter('email');
    const wa = makeFailAdapter('whatsapp');
    const orch = new NotificationOrchestrator(email, wa);
    const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1234567890' };
    await expect(orch.dispatch(mockPayload, prefs)).resolves.toHaveLength(2);
  });
});
