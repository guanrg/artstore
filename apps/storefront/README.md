# Storefront (Next.js + Capacitor Android)

## Local web development

```bash
npm run dev
```

## Android shell (Capacitor)

This project includes a Capacitor Android shell at `apps/storefront/android`.

Current default mobile web URL is set in `apps/storefront/capacitor.config.ts`:

- `http://10.0.2.2:3000` (Android emulator access to host `localhost:3000`)

### Run flow

1. Start backend/services from repo root:

```bash
npm run dev:all
```

2. If you did not run `dev:all`, start storefront web server:

```bash
npm run dev:storefront
```

3. Sync Capacitor project:

```bash
npm run android:sync
```

4. Open Android Studio project:

```bash
npm run android:open
```

5. In Android Studio, run app on emulator/device.

## Useful scripts (apps/storefront)

- `npm run cap:sync`
- `npm run cap:open:android`
- `npm run cap:run:android`
