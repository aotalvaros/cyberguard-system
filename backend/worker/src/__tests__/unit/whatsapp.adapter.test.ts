import { WhatsAppAdapter } from '../../notifications/whatsapp.adapter';
import type { NotifPayload } from '../../notifications/notification.types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPayload: NotifPayload = {
  eventId: 'evt-002',
  type: 'phishing',
  severity: 'critical',
  sourceIp: '10.0.0.2',
  description: 'Phishing attempt detected',
  receivedAt: '2026-04-06T00:00:00Z',
  recipientEmail: 'admin@cyberguard.com',
  recipientPhone: '+573001234567',
};

describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    adapter = new WhatsAppAdapter('wa-token', 'phone-number-id');
  });

  afterEach(() => jest.useRealTimers());

  it('should return success on first attempt', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.123' }] } });
    const result = await adapter.send(mockPayload);
    expect(result.status).toBe('success');
    expect(result.canal).toBe('whatsapp');
    expect(result.attempts).toBe(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    mockedAxios.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.456' }] } });

    const promise = adapter.send(mockPayload);
    await jest.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.status).toBe('success');
    expect(result.attempts).toBe(2);
  });

  it('should return error after 3 failed attempts', async () => {
    mockedAxios.post.mockRejectedValue(new Error('WA API error'));

    const promise = adapter.send(mockPayload);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.status).toBe('error');
    expect(result.attempts).toBe(3);
  });

  it('should NOT throw even after all retries exhausted', async () => {
    mockedAxios.post.mockRejectedValue(new Error('fatal'));
    const promise = adapter.send(mockPayload);
    await jest.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toMatchObject({ status: 'error', canal: 'whatsapp' });
  });

  it('should call the correct WhatsApp API URL', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.789' }] } });
    await adapter.send(mockPayload);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v18.0/phone-number-id/messages',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer wa-token' }),
      }),
    );
  });
});
