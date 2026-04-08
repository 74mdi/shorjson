# Deploying koki

koki is a stateless Next.js app backed by PostgreSQL. The intended production
setup is a managed Postgres database such as Neon.

## Required environment variables

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
AUTH_SECRET=replace-with-a-long-random-secret
```

## Neon setup

1. Create a project in Neon.
2. Copy the pooled PostgreSQL connection string.
3. Make sure `sslmode=require` is present.
4. Add that value as `DATABASE_URL` in your deployment environment.

## Deploy

```bash
npm install
npm run build
npm start
```

On Vercel, import the repo, add `DATABASE_URL` and `AUTH_SECRET`, then deploy.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app bootstraps its tables automatically on first database connection.
