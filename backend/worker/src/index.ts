import { startWebSocket, broadcast, closeWebSocket } from './websocket';
import { connectAndConsume, closeRabbit } from './rabbitmq';
import { handleMessage } from './handler';
import { WS_PORT } from './config';
import { logger } from '../../src/config/logger';

async function main() {
  startWebSocket(WS_PORT);

  await connectAndConsume(async (data, routingKey, raw) => {
    const payload = await handleMessage(data, routingKey);
    broadcast(payload);
    // after successful broadcast, ack is handled in rabbitmq implementation via onMessage success
  });
}

process.on('SIGINT', async () => {
  logger.info('Worker shutting down');
  await closeRabbit();
  await closeWebSocket();
  process.exit(0);
});

main().catch((err) => {
  logger.error('Worker failed to start', { error: err?.message });
  process.exit(1);
});
