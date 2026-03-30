import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const { Client } = pg;
const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/schema.sql');

let schemaReady;

async function runQuery(text, params = []) {
  const client = new Client({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
  });

  await client.connect();
  try {
    return await client.query(text, params);
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureSchema() {
  schemaReady ||= readFile(schemaPath, 'utf8')
    .then((schema) => runQuery(schema))
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  await schemaReady;
}

export async function query(text, params = []) {
  try {
    const result = await runQuery(text, params);
    return result;
  } catch (error) {
    if (error.code !== '42P01') {
      throw error;
    }

    await ensureSchema();
    const result = await runQuery(text, params);
    return result;
  }
}
