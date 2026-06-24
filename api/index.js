import { createApp } from '../server/src/server.js';

const app = createApp({ serveClient: false });

function apiPathFromRequest(req) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.searchParams.get('path');

  if (!path) {
    return req.url.startsWith('/api') ? req.url : `/api${req.url}`;
  }

  url.searchParams.delete('path');
  const query = url.searchParams.toString();
  return `/api/${path}${query ? `?${query}` : ''}`;
}

export default function handler(req, res) {
  req.url = apiPathFromRequest(req);
  return app(req, res);
}
