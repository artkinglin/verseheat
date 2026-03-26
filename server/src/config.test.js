import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from './config.js';

describe('config validation', () => {
  it('reports missing deploy variables in development defaults', () => {
    const missing = validateConfig();
    assert.ok(missing.includes('DATABASE_URL'));
    assert.ok(missing.includes('JWT_SECRET'));
    assert.ok(missing.includes('ESV_API_KEY'));
  });
});
