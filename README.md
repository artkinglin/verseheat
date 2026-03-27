# Verse Heat

Verse Heat is a full-stack MVP for rating ESV Bible verses and chapters with a red-to-yellow-to-green heat map.

## Stack

- React, Vite, Tailwind CSS
- D3 color scales for heat map coloring
- Node.js, Express
- PostgreSQL via `pg`
- JWT email/password auth

## ESV API

Create an API token at <https://api.esv.org/> and set `ESV_API_KEY` on the server. The server proxies ESV requests and does not store ESV text locally.

## Local Setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Run the database schema:

```bash
psql "$DATABASE_URL" -f server/db/schema.sql
```

## Environment

Server:

- `PORT=4000`
- `DATABASE_URL=postgres://user:password@localhost:5432/verse_heat`
- `JWT_SECRET=change-me`
- `ESV_API_KEY=your-esv-token`
- `CLIENT_ORIGIN=http://localhost:5173`

Client:

- `VITE_API_URL=http://localhost:4000`

## Deploy

Vercel can run the Vite client and Express API together. The catch-all function in `api/[...path].js` passes `/api/*` requests to the Express app, while the SPA rewrite sends non-API routes to `index.html`.

For same-project Vercel deployments, `VITE_API_URL` can be omitted because the production client uses same-origin `/api/*` requests by default. Configure these Vercel environment variables instead:

- `DATABASE_URL`
- `JWT_SECRET`
- `ESV_API_KEY`
- `CLIENT_ORIGIN=https://your-vercel-domain.vercel.app`

Provision PostgreSQL and apply `server/db/schema.sql` before using ratings or auth. If the API is hosted elsewhere, set `VITE_API_URL` to that API origin, for example `https://your-api.example.com`.
