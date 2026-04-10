import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './server.js';

describe('API server', () => {
  const app = createApp();

  it('responds to health checks', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.equal(response.body.ok, true);
  });

  it('lists Bible books', async () => {
    const response = await request(app).get('/api/bible/books').expect(200);
    assert.equal(response.body.books.length, 66);
    assert.equal(response.body.books[42].name, 'John');
  });

  it('protects streak endpoints', async () => {
    await request(app).get('/api/streak/me').expect(401);
    await request(app).post('/api/streak/restore').expect(401);
  });

  it('protects mission endpoints', async () => {
    await request(app).get('/api/missions/today').expect(401);
  });

  it('protects completion endpoints', async () => {
    await request(app).get('/api/completion/me').expect(401);
  });
});
