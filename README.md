# Strapi + Medusa Ecommerce Starter

Monorepo structure:

- `apps/medusa`: Medusa backend (product/order/checkout APIs)
- `apps/strapi`: Strapi CMS (content management)
- `apps/storefront`: Next.js storefront (consumes Medusa + Strapi)

## Requirements

- Node.js 20+
- npm 10+
- Docker (for Postgres + Redis)

## Quick start

Use one command to start infra + all services:

```bash
npm run dev:all
```

Or start them manually:

1. Start infrastructure:

```bash
npm run infra:up
```

2. Start Medusa:

```bash
npm run dev:medusa
```

3. Start Strapi:

```bash
npm run dev:strapi
```

4. Configure storefront environment:

```bash
copy apps\storefront\.env.local.example apps\storefront\.env.local
```

5. Start storefront:

```bash
npm run dev:storefront
```

## Default local ports

- Storefront: `http://localhost:3000`
- Strapi: `http://localhost:1337`
- Medusa API/Admin: `http://localhost:9000`

## Android app shell (Capacitor)

- Sync Android project files: `npm run android:sync`
- Open Android Studio project: `npm run android:open`
- Run from CLI (requires Android SDK/emulator): `npm run android:run`

## First-time setup notes

- In Strapi admin, create an `Article` collection type and allow Public role `find` and `findOne`.
- In Medusa, create a publishable API key and set it in `apps/storefront/.env.local` (`MEDUSA_PUBLISHABLE_KEY`).
