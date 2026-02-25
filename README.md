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
npm run dev:all:clean
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
- Medusa API/Admin: `http://localhost:9000/app`

## Android app shell (Capacitor)

- Sync Android project files: `npm run android:sync`
- Open Android Studio project: `npm run android:open`
- Run from CLI (requires Android SDK/emulator): `npm run android:run`

## First-time setup notes

- In Strapi admin, create an `Article` collection type and allow Public role `find` and `findOne`.
- In Medusa, create a publishable API key and set it in `apps/storefront/.env.local` (`MEDUSA_PUBLISHABLE_KEY`).


■前台Storefront:
http://localhost:3000

■后台Medusa： 
http://localhost:9000/app
guanrg@gmail.com / Admin#123456

■内容管理：
http://localhost:1337
guanrg@gmail.com / Strapi#123456



## 换电脑最稳流程如下。

  1. 拷代码到新电脑

  git clone <你的仓库地址>
  cd 026.dev

  2. 安装基础环境

  - Node.js 20+
  - npm 10+
  - Docker Desktop
  - Android Studio（如果要跑安卓壳）

  3. 安装依赖

  npm install
  npm --prefix apps/storefront install

  4. 配环境变量

  copy apps\storefront\.env.local.example apps\storefront\.env.local

  然后按你旧电脑的值补齐 apps/storefront/.env.local（尤其 Medusa key、API 地址）。

  5. 一键启动后端和前台

  npm run dev:all

  若端口冲突：

  npm run dev:all:clean

  6. 安卓壳继续开发

  npm run android:sync
  npm run android:open

  然后在 Android Studio 里运行模拟器/真机。

  7. 提交你本地改动

  git add .
  git commit -m "chore: continue on new machine"
  git push

  关键点：

  - apps/storefront/android/ 建议纳入 git（团队协作更省事）。
  - 不要提交 .env.local。
  - 新电脑第一次跑安卓时，先在 Android Studio 安装 SDK/Build-Tools。


› Implement {feature}

  ? for shortcuts                                                    