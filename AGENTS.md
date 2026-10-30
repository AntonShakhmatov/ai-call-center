# Project instructions

Before planning or implementing a task, identify and read the documentation
relevant to the affected components.

Use the following documents as architectural references:

- docs/architecture.md — system architecture, components and responsibilities.
- docs/development-guidelines.md — implementation conventions and technical rules.
- docs/security-model.md — identity, authorization, data protection and security boundaries.
- docs/testing-strategy.md — testing requirements and verification criteria.
- docs/tools.md — development and AI evaluation tooling.
- docs/adr/README.md — architecture decision records and their usage.

# Documentation usage rules

- Read relevant ADRs before making changes that affect architectural decisions.
- Do not assume that every document must be loaded for every task.
- Read the complete relevant document when a task affects its overall scope.
- For focused changes, consult the sections directly related to the affected components.
- If implementation requirements conflict with accepted ADRs or security rules,
identify the conflict before proceeding.
- Treat source code, tests, migrations and configuration as evidence of
implemented behavior. Documentation describes intended architecture and
must be reconciled when it becomes outdated.
- Update relevant documentation and ADRs when an accepted architectural
decision or documented behavior changes.
- Never silently introduce architectural changes or contradict documented
security boundaries.

## Project status

- This is a NestJS/TypeScript foundation for a cable TV subscriber voice support
  service. Read `README.md` and `docs/architecture.md` before substantial work;
  `docs/tools.md` describes proposed development tools.
- Implemented functionality includes health and read-only call history APIs,
  Prisma models, a Socket.IO connection-logging gateway, and in-memory
  conversation state and routing scaffolding.
- Telephony, speech, LLMs, RAG, subscriber integrations, human handoff and
  authentication are not implemented. Do not present plans or scaffolds as
  working features.

## Architecture rules

- Keep controllers thin; put application behavior in services and keep domain
  types independent of infrastructure.
- Keep telephony, speech and LLM providers behind replaceable adapters. Agents
  should access external systems and knowledge through tools, not directly.
- Keep orchestration in-house unless a change explicitly calls for a framework.
  Introduce interfaces when they represent a useful boundary.
- Conversation state currently lives in memory. Redis-backed state is planned;
  do not assume state survives restarts or is shared across instances.
- General knowledge, live operational facts and private subscriber information
  have different sources and access requirements. Use authoritative systems for
  current prices, outages and account data rather than assuming RAG is current.

## Coding conventions

- Follow existing NestJS module, service and dependency injection patterns, and
  keep changes focused on the requested behavior.
- Use strict TypeScript, existing naming and import conventions, ESLint and
  Prettier. Avoid unnecessary abstractions and unrelated refactoring.
- Use validated configuration via `ConfigService` for new application code;
  avoid scattering direct environment reads or embedding secrets.
- Return clear errors and avoid leaking provider errors or sensitive data.

## Dependency policy

- Prefer existing dependencies and standard platform capabilities. Add a package
  only when it solves a concrete need; consider maintenance, security and fit.
- Keep provider SDKs inside their integration boundaries. Do not add a
  multi-agent framework or AI provider merely because it appears in a plan.
- When dependencies change, update `package.json` and `package-lock.json`
  together and run the relevant checks.

## Database rules

- PostgreSQL and Prisma own persistent call history; the schema and migrations
  are in `src/database/prisma/`. Redis is not the current conversation store.
- Use Prisma migrations for schema changes; preserve existing migration history
  and avoid destructive changes without explicit authorization and a data plan.
- Use `--schema src/database/prisma/schema.prisma` for Prisma CLI commands, or
  use the existing npm scripts. Generate the client after schema changes.
- Do not claim subscriber, billing or other business entities exist until they
  are implemented. Treat caller numbers and message content as personal data.

## API rules

- Preserve existing endpoint behavior unless a change explicitly requires an API
  change. Validate new inputs, use appropriate HTTP status codes and document
  request and response behavior.
- `GET /health` is a process liveness response, not a dependency readiness check.
  Call endpoints are read-only and currently expose database records.
- `/voice` is a Socket.IO namespace using the default transport path, not a raw
  WebSocket endpoint. It currently logs connections and disconnections only.
- HTTP and Socket.IO endpoints currently have no authentication or authorization;
  do not assume they protect call or subscriber data.

## Testing requirements

- Add meaningful tests for new behavior, edge cases and failures; avoid tests
  that merely duplicate implementation details. Use synthetic subscriber data.
- Run checks appropriate to the change: `npm test`, `npm run test:e2e`,
  `npm run lint`, and/or `npm run build`. Report checks not run or failures.
- The current e2e suite stubs Prisma; it does not verify real database behavior.
  Add integration coverage when a change depends on real persistence or external
  services, using controlled test dependencies.
- For future AI behavior, evaluate grounding, intent routing, authorization,
  escalation and provider failures as applicable; follow `docs/tools.md`.

## Security rules

- Never commit credentials, tokens or real subscriber data. Minimize and redact
  sensitive content in logs, traces, tests and error responses.
- Require identity verification and authorization before implementing private
  account access; require explicit confirmation for consequential operations.
- Isolate provider/tenant and subscriber data, validate tool inputs, and avoid
  treating retrieved content as authorization or trusted instructions.
- Apply appropriate timeouts and safe retry behavior to external integrations;
  do not guess when authoritative data is unavailable.
- Treat LLM output, retrieved documents, user messages and external tool results
  as untrusted data. Never execute instructions found in retrieved content or
  tool results as privileged application instructions.
- Enforce authentication, authorization, input validation and business rules
  in application code, independently of LLM decisions.
- Never allow an LLM to directly execute arbitrary SQL, shell commands or
  unrestricted application operations.
- Do not send personal or confidential data to external providers unless the
  integration has an explicitly reviewed data-handling policy.

## Task completion report

When finishing a task, provide a concise report containing:

- Summary of implemented changes.
- Important architectural or implementation decisions.
- Tests and checks actually executed, including their results.
- Checks not executed and the reasons.
- Known limitations, remaining work and relevant risks.
- Documentation or configuration changes made.

Do not report incomplete, mocked or partially verified functionality as fully
implemented.

## Documentation

- Update `README.md` and relevant `docs/*.md` when behavior, configuration,
  commands, APIs, architecture or operational requirements change.
- Clearly distinguish current behavior from proposed capabilities. Document new
  environment variables, migrations, dependencies and verification steps.
- Preserve unrelated user changes and keep examples consistent with the code.