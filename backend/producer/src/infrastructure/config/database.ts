import { Pool, QueryResult } from 'pg';
import { logger } from './logger';

const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number.parseInt(process.env.POSTGRES_PORT ?? '5432'),
  database: process.env.POSTGRES_DB ?? 'cyberguard_db',
  user: process.env.POSTGRES_USER ?? 'cyberguard',
  password: process.env.POSTGRES_PASSWORD ?? 'cyberguard_secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const start = Date.now();
  const result: QueryResult = await pool.query(text, params);
  const duration = Date.now() - start;

  logger.debug('SQL query executed', {
    text: text.substring(0, 100),
    duration,
    rows: result.rowCount
  });

  return result.rows as T[];
}

export function getPool(): Pool {
  return pool;
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('PostgreSQL pool closed');
}
