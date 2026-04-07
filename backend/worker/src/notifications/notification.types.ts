export interface NotifPayload {
  eventId: string;
  type: string;
  severity: string;
  sourceIp: string;
  description: string;
  receivedAt: string;
  recipientEmail: string;
  recipientPhone: string;
}

export interface NotifResult {
  canal: 'email' | 'whatsapp';
  status: 'success' | 'error';
  attempts: number;
  error?: string;
}

export interface INotificationService {
  send(payload: NotifPayload): Promise<NotifResult>;
}
