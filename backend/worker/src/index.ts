import { WorkerServiceFactory } from './infrastructure/WorkerServiceFactory';
import { WS_PORT } from './infrastructure/config';
import { logger } from './infrastructure/logging';
import { ThreatEventProcessorService } from './application/services/ThreatEventProcessorService';

/**
 * Bootstrap — punto de entrada del Worker.
 * Solo responsabilidad: inicializar infraestructura y arrancar el consumo de eventos.
 * Toda la lógica vive en Application (use-cases) e Infrastructure (adapters).
 */
async function main() {
  const repository = WorkerServiceFactory.getRepository();
  const broadcaster = WorkerServiceFactory.getBroadcaster();
  const consumer = WorkerServiceFactory.getConsumer();

  const processThreat = WorkerServiceFactory.getProcessThreatEventUseCase();
  const processDeleted = WorkerServiceFactory.getProcessDeletedThreatUseCase();
  const threatEventProcessorService = new ThreatEventProcessorService(processThreat, processDeleted);

  await repository.connect();
  broadcaster.start(WS_PORT);

  await consumer.consume(async (data, routingKey) => threatEventProcessorService.process(data, routingKey));

  // Graceful Shutdown — cierra en orden: broker → persistencia → websocket
  process.on('SIGINT', async () => {
    logger.info('Worker shutting down');
    await consumer.close();
    await repository.close();
    await broadcaster.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Worker failed to start', { error: err?.message });
  process.exit(1);
});
