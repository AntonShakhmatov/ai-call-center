# ai-voice-agent

Backend platform for an AI voice call-center agent.

The system will eventually receive incoming phone calls, process audio in real time,
recognize speech, understand customer intent, answer common questions with AI,
interact with business systems (menu, opening hours, promotions, reservations),
transfer calls to human operators, and store call history, transcripts and analytics.

**This repository currently contains the foundation only.** No voice AI, telephony,
LLM or business logic is implemented yet — the architecture is prepared for it.

## Technology stack

| Layer            | Choice                     |
| ---------------- | -------------------------- |
| Runtime          | Node.js (22+)              |
| Language         | TypeScript                 |
| Framework        | NestJS 11                  |
| Database         | PostgreSQL 16              |
| ORM              | Prisma 6                   |
| Cache / session  | Redis 7 (via ioredis)      |
| Realtime         | Socket.IO (WebSocket)      |
| API              | REST (`/health`, `/calls`) |
| Quality          | ESLint 9, Prettier 3       |
| Tests            | Jest 29 + Supertest        |
| Containerization | Docker / Docker Compose    |

## Architecture overview

```
src/
├── app/                  # AppModule, AppController (GET /health)
├── config/               # Centralized env config (ConfigModule + validation)
├── common/
│   ├── logger/           # AppLogger (log/warn/error/debug)
│   ├── exceptions/       # AllExceptionsFilter
│   ├── guards/           # (extend later)
│   ├── interceptors/     # HttpLoggingInterceptor
│   └── decorators/       # (extend later)
├── database/prisma/      # PrismaService + schema.prisma + migrations
├── cache/redis/          # RedisService
├── calls/                # REST endpoints for call history
├── voice/                # VoiceGateway (WebSocket) + VoiceService boundary
├── agents/               # Specialized agents (conversation, faq, reservation, support)
├── orchestration/        # Orchestrator, conversation state, intent router
├── tools/                # Menu, opening-hours, promotions, reservation, transfer
├── knowledge/            # Knowledge retrieval boundary
├── operators/            # Human operator / handoff boundary
├── analytics/            # Call analytics & transcripts boundary
└── domain/               # Shared domain types (Call, Conversation, Intent, ...)
```

Key boundaries:

- **Orchestrator** controls conversation state and agent routing.
- **Agents** never access the database directly — they interact with the outside
  world exclusively through **tools**.
- **Tools** wrap external systems (business APIs, telephony, data stores).
- **Telephony and LLM providers are not baked into domain code**; they are
  replaceable adapters behind the voice / agent layers.
- **Redis** will hold active call/session state (currently sessions live in
  memory until Redis-backed state is wired up).
- **PostgreSQL** holds persistent call history and business data.

See [docs/architecture.md](docs/architecture.md) for the intended future flow and
the human handoff design.

## Prerequisites

- Node.js 22+ and npm 11+
- Docker + Docker Compose (optional, for PostgreSQL/Redis containers)

## Local development

### 1. Configure environment

```bash
cp .env.example .env
```

`.env` is git-ignored; never commit real secrets. Configuration is loaded and
validated once by `ConfigModule` — `process.env` is not read throughout the app.

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d
```

(or use any local PostgreSQL 16 / Redis 7 instances and point `DATABASE_URL` /
`REDIS_URL` at them.)

### 3. Install dependencies, generate the Prisma client, and migrate

```bash
npm install
npx prisma generate --schema src/database/prisma/schema.prisma
npx prisma migrate dev --schema src/database/prisma/schema.prisma
```

The initial migration is already provided under
`src/database/prisma/migrations/`. The backend container runs
`prisma migrate deploy` automatically on startup.

### 4. Run the application

```bash
npm run start:dev
```

Verify:

```bash
curl http://localhost:3000/health
# => { "status": "ok", "environment": "development", ... }
```

WebSocket (for future realtime voice):

```bash
ws://localhost:3000/voice
```

Only connection/disconnection logging is implemented at this stage.

## Environment variables

| Variable       | Description               | Example                                                            |
| -------------- | ------------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`     | Runtime environment       | `development`                                                      |
| `PORT`         | HTTP server port          | `3000`                                                             |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://callcenter:callcenter@localhost:5432/ai_voice_agent` |
| `REDIS_URL`    | Redis connection URL      | `redis://localhost:6379`                                           |

Inside Docker Compose the backend uses the service names (`postgres`, `redis`),
so `DATABASE_URL` becomes `postgresql://...@postgres:5432/...`.

## Docker commands

```bash
# Build and start the full stack (PostgreSQL + Redis + backend)
docker compose up --build -d

# Follow backend logs
docker compose logs -f backend

# Run migrations inside the backend container
docker compose exec backend npx prisma migrate deploy --schema src/database/prisma/schema.prisma

# Inspect the database
docker compose exec postgres psql -U callcenter -d ai_voice_agent

# Stop everything (containers stay, volumes persist)
docker compose down

# Stop and remove data volumes as well
docker compose down -v
```

## Scripts

| Script                    | Purpose                       |
| ------------------------- | ----------------------------- |
| `npm run start:dev`       | Hot-reload development server |
| `npm run build`           | TypeScript build (`dist/`)    |
| `npm run lint`            | ESLint on `src/` and `test/`  |
| `npm run format`          | Prettier format               |
| `npm test`                | Jest unit tests               |
| `npm run test:e2e`        | Jest e2e tests (supertest)    |
| `npm run prisma:generate` | Generate the Prisma client    |
| `npm run prisma:migrate`  | Apply a new dev migration     |
| `npm run prisma:deploy`   | Apply committed migrations    |
| `npm run prisma:studio`   | Open Prisma Studio            |

## API

| Method | Path         | Description                  |
| ------ | ------------ | ---------------------------- |
| GET    | `/health`    | Liveness check               |
| GET    | `/calls`     | List calls                   |
| GET    | `/calls/:id` | Single call (404 if unknown) |

The calls endpoints currently expose the raw persistent call records. Business
logic and DTOs will be added together with real call handling.

## Testing

```bash
npm test                 # unit + module instantiation tests
npm run test:e2e         # supertest e2e (health + calls)
```

Coverage: app starts, `/health` responds, core modules (`CallsModule`,
`OrchestrationModule`, `VoiceModule`, `DatabaseModule`, `CacheModule`) instantiate.

## Current limitations

- No telephony provider integration (Twilio/Asterisk/…).
- No ASR, TTS, audio streaming or LLM integration.
- WebSocket gateway logs connections only; no message handling.
- Conversation state is in-memory, not Redis-backed yet.
- Agents, tools, knowledge and operators are module scaffolds without behavior.
- No authentication/authorization on the exposed endpoints yet.

## Planned next steps

1. Persistent call ingestion (REST + Postgres) and call lifecycle statuses.
2. Redis-backed active conversation state (replacing the in-memory map).
3. Provider-agnostic LLM adapter and intent recognition.
4. First generic agent + tool registry wired into the orchestrator.
5. FAQ/knowledge retrieval for common questions.
6. Business tools: menu, opening hours, promotions, reservations.
7. Operator presence and human handoff flow.
8. Telephony WebSocket media streaming and ASR/TTS adapters.
9. Transcript persistence and analytics.

## License

UNLICENSED — internal project.
