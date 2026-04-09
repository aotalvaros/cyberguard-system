import { RedisEventRepository } from './persistence/RedisEventRepository';
import { RabbitMQConsumer } from './messaging/RabbitMQConsumer';
import { WebSocketBroadcaster } from './websocket/WebSocketBroadcaster';
import { EmailAdapter } from './notifications/EmailAdapter';
import { WhatsAppAdapter } from './notifications/WhatsAppAdapter';
import { LogNotificationAdapter } from './notifications/LogNotificationAdapter';
import { NotificationOrchestrator } from './notifications/NotificationOrchestrator';
import { ProcessThreatEventUseCase } from '../application/use-cases/ProcessThreatEventUseCase';
import { ProcessDeletedThreatUseCase } from '../application/use-cases/ProcessDeletedThreatUseCase';
import { logger } from '../logger';

/**
 * Composition Root del Worker.
 * Único punto donde se instancian y conectan todas las dependencias concretas.
 * Patrón: Composition Root + Lazy Singleton.
 * Las implementaciones concretas (infraestructura) no se conocen fuera de este archivo.
 */
export class WorkerServiceFactory {
  private static repository: RedisEventRepository | null = null;
  private static consumer: RabbitMQConsumer | null = null;
  private static broadcaster: WebSocketBroadcaster | null = null;
  private static orchestrator: NotificationOrchestrator | null = null;

  static getRepository(): RedisEventRepository {
    if (!this.repository) {
      this.repository = new RedisEventRepository();
    }
    return this.repository;
  }

  static getConsumer(): RabbitMQConsumer {
    if (!this.consumer) {
      this.consumer = new RabbitMQConsumer();
    }
    return this.consumer;
  }

  static getBroadcaster(): WebSocketBroadcaster {
    if (!this.broadcaster) {
      this.broadcaster = new WebSocketBroadcaster(this.getRepository());
    }
    return this.broadcaster;
  }

  static getOrchestrator(): NotificationOrchestrator {
    if (!this.orchestrator) {
      this.orchestrator = new NotificationOrchestrator(
        this.buildEmailService(),
        this.buildWhatsAppService(),
      );
    }
    return this.orchestrator;
  }

  static getProcessThreatEventUseCase(): ProcessThreatEventUseCase {
    return new ProcessThreatEventUseCase(
      this.getRepository(),
      this.getBroadcaster(),
      this.getOrchestrator(),
    );
  }

  static getProcessDeletedThreatUseCase(): ProcessDeletedThreatUseCase {
    return new ProcessDeletedThreatUseCase(
      this.getRepository(),
      this.getBroadcaster(),
    );
  }

  static resetForTesting(): void {
    this.repository  = null;
    this.consumer    = null;
    this.broadcaster = null;
    this.orchestrator = null;
  }

  // ─── builders privados ───────────────────────────────────────────────────────

  private static buildEmailService() {
    const sgKey  = process.env.SENDGRID_API_KEY    || '';
    const sgFrom = process.env.SENDGRID_FROM_EMAIL || '';
    if (!sgKey || !sgFrom) {
      logger.warn('SendGrid not configured — email notifications will be logged only');
      return new LogNotificationAdapter('email');
    }
    return new EmailAdapter(sgKey, sgFrom);
  }

  private static buildWhatsAppService() {
    const twSid   = process.env.TWILIO_ACCOUNT_SID   || '';
    const twToken = process.env.TWILIO_AUTH_TOKEN     || '';
    const twFrom  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    if (!twSid || !twToken) {
      logger.warn('Twilio not configured — whatsapp notifications will be logged only');
      return new LogNotificationAdapter('whatsapp');
    }
    return new WhatsAppAdapter(twSid, twToken, twFrom);
  }
}
