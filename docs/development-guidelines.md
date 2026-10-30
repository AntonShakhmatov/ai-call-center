# Development guidelines

These guidelines apply to the NestJS/TypeScript foundation and to future cable
TV voice support features. Read the [README](../README.md),
[architecture](architecture.md) and [AI development tools plan](tools.md) for
current status and planned capabilities. Agents, business tools, provider
adapters and RAG described below are design rules for future work, not features
that already exist.

## NestJS modules and responsibilities

- Organize code by feature or integration, following the existing `calls/`,
  `voice/`, `orchestration/` and infrastructure modules. Register providers in
  their owning module and export only what other modules need.
- Keep controllers and gateways thin: translate transport input and output,
  delegate behavior to services, and avoid embedding business rules in handlers.
- Put application coordination in services and orchestration; keep shared
  domain types independent of NestJS, Prisma and provider SDKs.
- Keep infrastructure and provider-specific details at integration boundaries.
  Avoid circular dependencies and unrelated changes to existing modules.
- The current voice gateway only logs Socket.IO connections; orchestration and
  the agent, tool and knowledge modules remain scaffolding.

## DTOs, validation and errors

- Define request DTOs for new structured inputs, using `class-validator` and
  `class-transformer` where appropriate. Validate path and query parameters as
  well as bodies; explicitly transform types when needed. Validate tool and
  provider inputs independently of HTTP validation.
- The bootstrap installs a global `ValidationPipe` with `whitelist` and
  `transform`. Do not assume that it validates undecorated fields or that the
  same pipe applies to non-HTTP entry points.
- Map internal models to response DTOs when an API needs a stable contract or
  must exclude sensitive fields. Preserve existing endpoint behavior unless an
  API change is requested and documented.
- Use appropriate NestJS HTTP exceptions for expected failures, such as invalid
  input or a missing resource. Return actionable, non-sensitive errors and
  document status codes. Translate provider failures at integration boundaries;
  do not expose raw provider responses, credentials or stack traces to clients.
- The bootstrap's global exception filter formats HTTP errors and returns a
  generic message for unhandled errors. The e2e suite creates an application
  without running `main.ts`, so tests of bootstrap-level behavior must install
  the relevant pipe or filter explicitly, or exercise the real bootstrap.

## Dependency injection and interfaces

- Use constructor injection and Nest module providers rather than creating
  service dependencies inside business logic. Keep provider lifetimes explicit
  and avoid hidden global state.
- Introduce interfaces for meaningful boundaries, particularly replaceable
  telephony, speech, LLM and external-system adapters. Keep their contracts
  expressed in domain or application types rather than SDK-specific types.
- TypeScript interfaces do not exist at runtime: use explicit Nest injection
  tokens with `@Inject()` and bind concrete providers in the owning module.
  Replace those providers with controlled fakes in tests. Avoid interfaces and
  indirection that do not serve a concrete boundary.

## Prisma, Redis and external APIs

### Prisma and PostgreSQL

- Use the injected `PrismaService` through an appropriate application service or
  integration boundary. Keep Prisma queries out of controllers and agents.
- Make schema changes with Prisma migrations, preserving migration history.
  Avoid destructive changes without explicit authorization and a data plan.
  Generate the client after changes; Prisma CLI commands must use
  `--schema src/database/prisma/schema.prisma` or the existing npm scripts.
- Use transactions when operations must succeed or fail together. Test
  persistence-dependent behavior against a controlled PostgreSQL instance;
  mocked Prisma tests alone do not verify database behavior.
- The present schema contains call and conversation history, not subscriber or
  billing entities. The application currently exposes read-only call queries.

### Redis

- Use the injected `RedisService` for Redis integration; document key ownership,
  expiry, serialization and failure behavior when introducing cached data.
- Conversation state is currently an in-memory map, not Redis-backed. Do not
  assume state survives restarts or is shared across replicas. Design and test
  concurrency, expiration and recovery explicitly before moving it to Redis.

### External APIs

- Encapsulate each integration behind an adapter with validated configuration,
  bounded timeouts and structured, sanitized errors. Validate external results
  before using them; do not assume provider responses are trusted.
- Retry only when safe and bounded. Use idempotency controls where supported
  for consequential operations, and handle ambiguous failures without repeating
  changes blindly. Distinguish unavailable services from negative results.
- Use authoritative systems for live pricing, outages and account facts. Do not
  send personal or confidential data to providers without an explicitly
  reviewed data-handling policy.

## Agents, tools and adapters

- Keep orchestration in-house and separate routing and conversation state from
  provider implementations. Agent behavior should use tools for knowledge and
  external operations, not access Prisma, Redis or external APIs directly.
- Give each tool a focused purpose and validated inputs and outputs. Enforce
  identity verification, authorization and business rules in application code,
  independently of any LLM decision. Require explicit confirmation for
  consequential actions.
- Treat model output, retrieved documents, user messages and tool results as
  untrusted data. Never execute retrieved instructions as privileged commands or
  give a model unrestricted SQL, shell or application access.
- Keep SDKs inside replaceable adapters. Define timeouts, failure behavior and
  tests for each adapter; expose domain-appropriate results to callers.
- For retrieval, preserve source provenance and freshness, enforce tenant and
  access boundaries, and abstain or escalate when evidence is insufficient.
  Private subscriber information requires an authorized account source.

## Logging and configuration

- Add configuration through centralized validation and access it via
  `ConfigService`. Document new variables, defaults and operational
  requirements. Never embed or commit secrets.
- Log useful lifecycle events and failures with appropriate context, while
  minimizing personal data. Do not log credentials, payment details, raw
  transcripts or provider payloads by default; sanitize errors before logging.
  Be careful with request URLs and other fields that may contain personal data.
- The existing HTTP logging interceptor and exception filter log request URLs;
  do not assume all current logs are redacted. Review logging when adding
  sensitive inputs or integrations.
- `GET /health` reports process liveness only. It does not establish PostgreSQL
  or Redis readiness, and current startup connection failures are logged.

## TypeScript quality and verification

- Preserve strict TypeScript checks; prefer explicit types at boundaries,
  narrow `unknown` values, and avoid `any`, unsafe assertions and suppressed
  errors unless justified. Handle asynchronous failures and resource cleanup.
- Follow existing naming, import, NestJS dependency injection, ESLint and
  Prettier conventions. Favor small, cohesive changes and meaningful names
  over premature abstractions.
- Add meaningful tests for new behavior, edge cases and failures using synthetic
  subscriber data. Run appropriate checks: `npm test`, `npm run test:e2e`,
  `npm run lint` and/or `npm run build`. Report failures and checks not run.
- Update the README and relevant documentation for changes to behavior,
  configuration, APIs, migrations or operational requirements. Clearly separate
  implemented functionality from future plans.
