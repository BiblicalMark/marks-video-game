# Marks Video Game Prototype

This is the starter repository for a web-based video game built with **Next.js** and **Phaser**. It includes a minimal development setup, API route, and a placeholder Phaser scene.

## Getting Started

### Prerequisites
- **Node.js** (>=18 LTS) and **npm** on your PATH.
- Recommended: use `nvm` or install via [Node.js installer](https://nodejs.org/en/download/).

### Setup

```powershell
cd "C:\Users\acame\OneDrive\Desktop\Marks Video Game"
npm install      # install dependencies
npm run dev       # start development server
# run tests:
npm test
```

Database is stored in `data.db` at the project root by default. It will be created automatically.
You can override the path by setting `DB_FILE` (for example `:memory:` during tests or a different file in production).

An example environment file is provided in `.env.example`; copy it to `.env.local` when running locally.

Then open <http://localhost:3000> in your browser to view the application.

### Structure
- `pages/index.tsx` – Next.js page with a simple Phaser game container.
- `pages/api/hello.ts` – Example API route.
- `next.config.js` – custom webpack config to avoid package.json parsing issues.
- `package.json` – project manifest with dependencies.
- `tsconfig.json` – generated TypeScript configuration.

### Deployment

This project can be deployed to **Vercel** (recommended), Netlify, Render, or any other
host that supports Next.js. Since Vercel is built by the Next.js team, it offers the
smoothest experience and free auto‑scaling.

#### Manual Vercel deployment

1. Install the CLI (`npm i -g vercel`) or use `npx vercel`.
2. Run `vercel login` then `vercel` from the repo root to link the project.
3. When prompted, choose your account and accept defaults (it will create a project
   based on the repo name).
4. In the Vercel dashboard, add the following Environment Variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
   - `DB_FILE` (optional; use a managed database URL or a path like `:memory:` for
     testing)
5. Add `data.db` to `.gitignore` (or never commit it) and push your code. Vercel will
   build and deploy automatically any time you push to `main`.

To trigger a production build from the CLI:

```sh
npx vercel --prod --token $VERCEL_TOKEN --confirm
```

#### Automatic GitHub deploys

You can also have GitHub Actions push every successful `main` build to Vercel. Create
a repository secret named `VERCEL_TOKEN` (API token generated from your Vercel
account) and optionally `VERCEL_PROJECT_ID`/`VERCEL_ORG_ID`. The CI workflow already
runs your tests and build; the following final step deploys on success:

```yaml
- name: Deploy to Vercel
  if: github.ref == 'refs/heads/main' && env.VERCEL_TOKEN
  run: npx vercel --prod --token $VERCEL_TOKEN --confirm
```
```

You can also build and run the project inside a Docker container:

```sh
# build image from project root
docker build -t marks-game .
# run exposing port 3000
docker run -p 3000:3000 --env-file .env.local marks-game
```

Make sure `.env.local` contains the same variables as above.

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push to `main` to install, build, and lint.

### Notes
- If you encounter `npm`/`node` errors, ensure your execution policy is configured (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- The development environment is configured for fast iteration. We’ll expand the game logic and backend gradually.

### Next Steps
- Add gameplay mechanics (Phaser scenes). The current prototype increments score on canvas clicks and persists it via a simple backend API (`GET`/`POST /api/score`). Authenticated users see a **Subscribe** button that redirects to a Stripe Checkout session (backend stub at `/api/checkout`).
- A minimal authentication system is included (see `/api/login`, `/api/logout`, `/api/user`) with a hard-coded user (alice/password123) and in-memory sessions. The front‑end displays a login form and protects the game.
- A simple score API now persists to a local SQLite file (`data.db`) using `better-sqlite3`. User accounts and scores survive restarts. The default account `alice/password123` is seeded automatically. The user record also tracks a boolean `is_subscribed` field.
- Stripe checkout integrated at `/api/checkout`. A webhook endpoint `/api/webhook` listens for `checkout.session.completed` events to mark users as subscribed. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` in your environment to enable.
- Implement more robust authentication, persistent storage, and payment flows as you build out the business model.
3. Integrate payment/subscription (Stripe).
4. Add analytics, telemetry, and deployment configuration.

Feel free to edit or extend the project as you see fit. Happy hacking!
