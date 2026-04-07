import { startWebSocket, broadcast, closeWebSocket } from './websocket';
import { connectAndConsume, closeRabbit } from './rabbitmq';
import { handleMessage } from './handler';
import { WS_PORT } from './config';
import { logger } from './logger';
import { connectRedis, saveToRedis, closeRedis } from './redis';

async function main() {
  await connectRedis();
  startWebSocket(WS_PORT);

  await connectAndConsume(async (data, routingKey, _raw) => {
    const payload = await handleMessage(data, routingKey);
    await saveToRedis(payload);
    broadcast(payload);
    
  });
}

process.on('SIGINT', async () => {
  logger.info('Worker shutting down');
  await closeRabbit();
  await closeRedis();
  await closeWebSocket();
  process.exit(0);
});

main().catch((err) => {
  logger.error('Worker failed to start', { error: err?.message });
  process.exit(1);
});
