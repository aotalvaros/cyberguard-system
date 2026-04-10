/**
 * Payload enviado a cada canal de notificación.
 */
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

/**
 * Resultado del intento de envío de una notificación.
 */
export interface NotifResult {
  canal: 'email' | 'whatsapp';
  status: 'success' | 'error';
  attempts: number;
  error?: string;
}

/**
 * Puerto del servicio de notificación.
 * Implementado por EmailAdapter, WhatsAppAdapter y LogNotificationAdapter.
 */
export interface INotificationService {
  send(payload: NotifPayload): Promise<NotifResult>;
}
