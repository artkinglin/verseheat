import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const { Pool } = pg;
const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/schema.sql');

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

let schemaReady;

async function ensureSchema() {
  schemaReady ||= readFile(schemaPath, 'utf8')
    .then((schema) => pool.query(schema))
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  await schemaReady;
}

export async function query(text, params = []) {
  await ensureSchema();
  const result = await pool.query(text, params);
  return result;
}
