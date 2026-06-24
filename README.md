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

Deploy the client as a static Vite app and the server as a Node service. Provision PostgreSQL, apply `server/db/schema.sql`, and configure the environment variables above.

For Vercel client deployments, set `VITE_API_URL` to the deployed API origin, for example `https://your-api.example.com` or `https://your-vercel-domain.vercel.app/api` if the API is hosted under the same Vercel project.
