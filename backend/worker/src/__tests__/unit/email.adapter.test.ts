import { EmailAdapter } from '../../infrastructure/notifications/EmailAdapter';
import type { NotifPayload } from '../../domain/ports/INotificationService';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sgMail = jest.requireMock('@sendgrid/mail');

const mockPayload: NotifPayload = {
  eventId: 'evt-001',
  type: 'malware',
  severity: 'high',
  sourceIp: '10.0.0.1',
  description: 'Malware detected on host',
  receivedAt: '2026-04-06T00:00:00Z',
  recipientEmail: 'admin@cyberguard.com',
  recipientPhone: '+573001234567',
};

describe('EmailAdapter', () => {
  let adapter: EmailAdapter;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    adapter = new EmailAdapter('test-api-key', 'noreply@cyberguard.com');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return success on first attempt', async () => {
    sgMail.send.mockResolvedValueOnce([{ statusCode: 202 }]);
    const result = await adapter.send(mockPayload);
    expect(result.status).toBe('success');
    expect(result.canal).toBe('email');
    expect(result.attempts).toBe(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    sgMail.send
      .mockRejectedValueOnce(new Error('500 Internal'))
      .mockResolvedValueOnce([{ statusCode: 202 }]);

    const promise = adapter.send(mockPayload);

    // advance past first backoff retry delay (1000ms)
    await jest.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result.status).toBe('success');
    expect(result.attempts).toBe(2);
  });

  it('should return error after 3 failed attempts', async () => {
    sgMail.send.mockRejectedValue(new Error('API error'));

    const promise = adapter.send(mockPayload);

    // attempt 1 fails → wait 1000ms
    await jest.advanceTimersByTimeAsync(1000);
    // attempt 2 fails → wait 2000ms
    await jest.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.status).toBe('error');
    expect(result.attempts).toBe(3);
    expect(result.error).toBeTruthy();
  });

  it('should NOT throw even after all retries exhausted', async () => {
    sgMail.send.mockRejectedValue(new Error('fatal'));

    const promise = adapter.send(mockPayload);
    await jest.advanceTimersByTimeAsync(5000);

    await expect(promise).resolves.toMatchObject({ status: 'error', canal: 'email' });
  });

  it('should call setApiKey in constructor', () => {
    expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
  });
});
