import { createApp } from '../server/src/server.js';

const app = createApp({ serveClient: false });

export default function handler(req, res) {
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
