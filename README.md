# ai-voice-agent

Backend platform for an AI-powered voice support agent for cable television
subscribers.

The assistant is intended to handle incoming calls to a provider's support line:
understand subscriber requests, answer questions about TV packages, channels,
billing, installation, troubleshooting and service policies, retrieve verified
information through authorized integrations, and transfer calls to human support
operators when necessary.

Intended users:

- Cable TV subscribers calling the provider's support number.
- Human support operators receiving escalated calls.
- Provider operations and support teams maintaining knowledge and policies.
- Developers extending the platform.

**This repository currently contains the architectural foundation only.** No
telephony, speech recognition, text-to-speech, LLM, RAG, subscriber, billing,
CRM or provisioning integration is implemented yet. See
[Current implementation status](#current-implementation-status) and
[Current limitations](#current-limitations).

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

## Current implementation status

Implemented:

- NestJS application bootstrap, centralized environment validation and logging.
- `GET /health`.
- Read-only call history endpoints backed by PostgreSQL through Prisma.
- Socket.IO gateway in the `/voice` namespace that logs connection and
  disconnection events.
- In-memory `ConversationStateService`, a skeleton orchestrator and an intent
  router with an empty agent registry.
- Prisma models and an initial migration for `Call`, `Conversation` and
  `ConversationMessage`.

Scaffolded but not implemented:

- `agents/`, `tools/`, `knowledge/`, `operators/` and `analytics/` are empty
  module boundaries.
- The voice layer does not process audio or messages.
- No authentication or authorization is applied to the HTTP or WebSocket
  endpoints.

## Product domain

### Subscriber questions and FAQ

These are intended use cases, not evidence that the corresponding data sources
or integrations already exist:

- Available TV packages and channel lineups.
- Subscription plans, pricing and package differences.
- Channel availability and package requirements.
- Service coverage and connection requirements.
- Billing procedures, payment methods and invoice explanations.
- Installation, equipment setup and basic troubleshooting.
- Service interruptions, maintenance notices and planned outages.
- Contract terms, cancellation rules and service policies.
- Customer support hours and contact information.

General provider documentation and FAQs may eventually be served through RAG.
Prices, outages, availability and other frequently changing operational data
must come from authoritative systems. Subscriber-specific information must come
from authenticated, authorized account systems.

### Subscriber-specific requests (planned integrations)

The platform is intended to support these capabilities through future,
tool-mediated integrations. None of these systems are connected today:

- Identifying and authenticating a subscriber.
- Retrieving subscription details and subscribed packages.
- Checking account status and billing information.
- Checking service availability or known outages for a subscriber's area.
- Creating a technical support ticket.
- Scheduling a technician visit.
- Initiating a package change or other account operation, subject to
  authorization and confirmation.

No subscriber API, CRM, billing system or provisioning system is assumed to
exist.

### Human handoff

A call should be transferred to a human support operator when:

- The subscriber explicitly requests a human.
- The issue cannot be resolved through the supported tools.
- Retrieved information is insufficient, outdated or conflicting.
- An account-specific or technical problem requires escalation.
- An operation fails or requires human authorization.

The planned `OperatorTransfer` domain boundary is described in
[docs/architecture.md](docs/architecture.md#human-handoff-and-conversation-context).

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
├── agents/               # AgentsModule scaffold for specialized agents
├── orchestration/        # Orchestrator, conversation state, intent router
├── tools/                # ToolsModule scaffold for external capabilities
├── knowledge/            # KnowledgeModule boundary for future RAG
├── operators/            # Human operator / handoff boundary
├── analytics/            # Call analytics & transcripts boundary
└── domain/               # Shared domain types (Call, Conversation, Intent, ...)
```

Key boundaries:

- **Orchestrator** owns conversation state and intent routing.
- **Agents** never access the database or external systems directly — they
  interact with the outside world exclusively through **tools**.
- **Tools** wrap external systems and business operations, including future
  knowledge retrieval, subscriber, billing, service-status, ticketing and
  scheduling capabilities.
- **Telephony and LLM providers are not baked into domain code**; they are
  intended to remain replaceable adapters behind the voice and agent layers.
- **Redis** will hold active call/session state. Today, conversation state is an
  in-memory map inside `ConversationStateService`.
- **PostgreSQL** holds persistent call history. The current schema contains only
  `Call`, `Conversation` and `ConversationMessage`; subscriber and business
  entities do not exist yet.
- **Knowledge** is a module boundary for a future RAG subsystem. No vector
  database, embedding provider or retrieval implementation exists.

See [docs/architecture.md](docs/architecture.md) for the intended call flow,
RAG design, security boundaries and human handoff design. See
[docs/tools.md](docs/tools.md) for the proposed AI development toolset and plan.
See [docs/development-guidelines.md](docs/development-guidelines.md) for coding
and integration conventions, and [docs/testing-strategy.md](docs/testing-strategy.md)
for the test layers and verification plan. The current security posture and
planned controls are described in [docs/security-model.md](docs/security-model.md).

## Prerequisites

- Node.js 22+ and npm 11+
- Docker + Docker Compose (optional, for PostgreSQL/Redis containers)

## Local development

### 1. Configure environment

```bash
cp .env.example .env
```

`.env` is git-ignored; never commit real secrets. Configuration is loaded and
validated once by `ConfigModule`. `src/main.ts` also reads `process.env.PORT`
for the listen port, falling back to `3000`.

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

Alternatively, use local PostgreSQL 16 / Redis 7 instances and point
`DATABASE_URL` / `REDIS_URL` at them.

### 3. Install dependencies, generate the Prisma client, and migrate

```bash
npm install
npx prisma generate --schema src/database/prisma/schema.prisma
npx prisma migrate dev --schema src/database/prisma/schema.prisma
```

The initial migration is already provided under
`src/database/prisma/migrations/`.

### 4. Run the application

```bash
npm run start:dev
```

Verify:

```bash
curl http://localhost:3000/health
# => { "status": "ok", "environment": "development", ... }
```

Socket.IO namespace (for future realtime voice):

```text
http://localhost:3000/voice
```

Connect with a Socket.IO client, using `/voice` as the namespace and the default
`/socket.io/` transport path; this is not a raw WebSocket endpoint. Only
connection and disconnection logging is implemented at this stage.

## Environment variables

| Variable       | Description               | Example                                                            |
| -------------- | ------------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`     | Runtime environment       | `development`                                                      |
| `PORT`         | HTTP server port          | `3000`                                                             |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://callcenter:callcenter@localhost:5432/ai_voice_agent` |
| `REDIS_URL`    | Redis connection URL      | `redis://localhost:6379`                                           |

Inside Docker Compose the backend uses the service names (`postgres`, `redis`),
so `DATABASE_URL` becomes `postgresql://...@postgres:5432/...`. Compose sets
the backend environment explicitly; changing the host `.env` does not override
those values. Defaults match the examples above. `NODE_ENV` accepts
`development`, `production`, or `test`; `PORT` must be an integer of at least 1.

## Docker commands

```bash
# Build and start the full stack (PostgreSQL + Redis + backend)
docker compose up --build -d

# Follow backend logs
docker compose logs -f backend

# Run committed migrations inside the backend container
docker compose exec backend npx prisma migrate deploy --schema src/database/prisma/schema.prisma

# Inspect the database
docker compose exec postgres psql -U callcenter -d ai_voice_agent

# Stop everything (containers stay, volumes persist)
docker compose down

# Stop and remove data volumes as well
docker compose down -v
```

The development container (`Dockerfile.dev`) runs `prisma migrate dev` on
startup. The production image (`Dockerfile`) does not run migrations
automatically; apply them as a deployment step. Its build currently runs
`prisma generate` without the custom schema path, so it requires correcting that
command to use `--schema src/database/prisma/schema.prisma` before it can build.
The Compose configuration uses `Dockerfile.dev`, not the production Dockerfile.

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

`GET /calls` includes the related conversation. `GET /calls/:id` includes the
conversation and its messages. The calls endpoints currently expose raw
persistent records; business logic and DTOs will be added together with real
call handling. The list has no pagination or explicit ordering. The ID is a
database UUID; a valid UUID with no matching call returns 404.

`GET /health` reports process status, environment, uptime and timestamp. It does
not check PostgreSQL or Redis readiness. Both services log connection failures
at startup; successful liveness does not guarantee that call queries will work.

There is currently **no authentication or authorization** on the HTTP API or
the WebSocket namespace. Do not expose this service publicly with real call or
subscriber data until those controls exist.

## Testing

```bash
npm test                 # unit + module instantiation tests
npm run test:e2e         # supertest e2e (health + calls)
```

The unit suite checks the health controller and instantiation of core providers.
The e2e suite checks health, an empty call list and a missing call using a stubbed
Prisma service; it does not verify database connectivity or actual persisted
records. The e2e app still initializes Redis, so a local Redis instance avoids
connection warnings.

## Current limitations

- No telephony provider integration (Twilio/Asterisk/…).
- No ASR, TTS, audio streaming or LLM integration.
- WebSocket gateway logs connections only; no message handling.
- Conversation state is in-memory, not Redis-backed yet.
- Agents, tools, knowledge and operators are module scaffolds without behavior.
- No RAG, vector store, embedding pipeline or knowledge ingestion.
- No subscriber authentication, CRM, billing, provisioning or outage
  integrations.
- No authentication/authorization on the exposed endpoints.
- The database contains call/conversation history only; there are no subscriber,
  account, ticket or scheduling entities.

## Domain-specific planned milestones

1. Persistent call ingestion and call lifecycle transitions wired to the REST
   layer and PostgreSQL.
2. Redis-backed active conversation state (replacing the in-memory map).
3. Provider-agnostic LLM adapter, speech adapters and intent recognition.
4. First cable TV support agent and tool registry wired into the orchestrator.
5. Knowledge ingestion and retrieval for approved provider documentation, FAQs,
   package descriptions, channel lineups, troubleshooting guides and policies.
6. Subscriber identity verification and authorized account lookup boundary.
7. Authoritative integrations for billing, service status/outages, support
   tickets and technician scheduling.
8. Operator presence and human handoff with conversation context.
9. Telephony media streaming and ASR/TTS adapters.
10. Transcript persistence, retention controls and analytics.

## License

UNLICENSED — internal project.
