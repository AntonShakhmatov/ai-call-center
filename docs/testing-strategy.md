# Testing strategy

This strategy covers the current NestJS foundation and the planned cable TV
voice support features. Use synthetic subscriber data, controlled dependencies
and repeatable fixtures throughout. See [development guidelines](development-guidelines.md)
for implementation conventions and [tools.md](tools.md) for the proposed AI
development tools.

## Test layers

| Layer | Tools | Purpose |
| --- | --- | --- |
| Static checks | TypeScript, ESLint, Prettier | Catch type errors, code-quality issues and formatting inconsistencies. |
| Unit tests | Jest | Verify isolated business rules, routing and error handling. |
| Integration tests | Jest with controlled dependencies | Verify interactions with real persistence or controlled external services. |
| E2E tests | Supertest with Jest | Verify HTTP behavior through the application boundary. |
| Security tests | Jest and adversarial cases | Verify authorization, isolation, validation and untrusted-input handling. |
| AI evaluations | Promptfoo (proposed) | Assess model-dependent behavior using repeatable scenarios. |
| Performance tests | Specialized scenarios (planned) | Measure latency, throughput and resource behavior under representative workloads. |

## Test reliability

- Tests must be repeatable and independent of execution order.
- Avoid arbitrary sleeps and timing assumptions; prefer explicit synchronization
  and controlled clocks where appropriate.
- Do not silently skip, disable or weaken failing tests.
- Investigate flaky tests and document the cause before applying a workaround.
- Clean up temporary resources, database records, connections and background
  tasks after test execution.

## Static checks

Run the checks relevant to a change:

```bash
npm run build
npm run lint
npx prettier --check "src/**/*.ts" "test/**/*.ts"
```

The build runs Nest's TypeScript compilation. The lint script checks `src/` and
`test/`; the Prettier command above checks formatting without changing files.
`npm run format` writes formatting changes to those TypeScript files. Check
documentation formatting separately when appropriate.

## Unit tests

```bash
npm test
npm run test:cov
```

Use Jest for focused tests of application services, domain decisions and
adapter behavior. Replace dependencies with controlled fakes and test observable
outcomes, including invalid input, missing data and failure paths. Prefer
meaningful behavior coverage over tests that restate implementation details or
coverage percentages alone.

The current unit suite covers the health controller and instantiation of core
providers. Expand it as behavior is implemented.

## Integration tests

Use Jest with controlled dependencies to test behavior that depends on actual
Prisma/PostgreSQL persistence, Redis semantics or external-system contracts.
Provide isolated test databases or service instances, apply migrations, seed only
synthetic data and clean up after tests. Exercise database constraints,
transactions and failure cases where relevant. For external APIs, use a
controlled test server or provider sandbox, including timeouts and malformed
responses; do not rely on live production services.

Real persistence and external-service integration suites are not currently
provided. Add them together with features that depend on those interactions and
document their setup and commands.

## E2E tests

```bash
npm run test:e2e
```

Use Supertest to check HTTP status codes, response contracts and error paths
through the application boundary. The current suite checks health, an empty
call list and a missing call with a stubbed Prisma service; it does not test
real database behavior. It initializes Redis, so a local instance avoids
connection warnings.

The existing suite creates its own Nest application without invoking
`src/main.ts`. Tests of global pipes, filters or interceptors must explicitly
install them or exercise the real bootstrap. Add Socket.IO or telephony
end-to-end coverage with appropriate clients when those behaviors are built;
Supertest alone does not verify voice streaming.

## Security tests

Use Jest and adversarial cases at the relevant unit, integration and transport
boundaries. As features are introduced, cover:

- Invalid, oversized or unexpected inputs, and sanitized error responses.
- Identity verification, authorization and provider/tenant isolation for
  private account data; attempts to access another subscriber's information.
- Explicit confirmation before consequential operations and safe handling of
  ambiguous failures or retries.
- Prompt injection in user messages, retrieved documents and tool results;
  enforce business rules independently of model output.
- Sensitive data handling in logs, traces and responses, using synthetic data.

These are requirements for future features, not claims that authentication or
the other protections already exist. Keep any security test dependencies
controlled and avoid production credentials and subscriber records.

## AI evaluations

Promptfoo is proposed but is not currently installed or configured. When model
features are added, maintain version-controlled synthetic cases for intent
routing, grounded answers, source freshness, tool selection, authorization,
human escalation and provider failure. Include missing, conflicting and
adversarial evidence, and measure abstention as well as successful answers.

Record prompts, model versions where available, fixtures and evaluation results
to make changes comparable. Run deterministic checks on each change; run
model-dependent evaluations in a controlled environment with explicit time and
cost limits. Review regressions rather than treating a model score alone as an
authorization or safety control.

## Performance tests

Specialized scenarios and tooling are planned, not currently implemented.
Select tools based on the feature under test and run against isolated test
infrastructure with synthetic data. Establish a baseline and explicit targets
before judging results. Representative scenarios include:

- Call-history API throughput, latency and database behavior as data grows.
- Concurrent active conversation state and Redis recovery when implemented.
- Retrieval latency and relevance under representative document volumes.
- End-to-end voice latency, transcription performance and concurrent calls
  once speech and telephony adapters exist.
- Provider timeouts, degraded dependencies and recovery under load.

Record test conditions, concurrency, latency percentiles, error rates and
resource usage; avoid making production-capacity claims from mocked tests.

## Regression testing

- Before changing existing behavior, identify affected modules, callers,
  API contracts and related tests.
- Add regression tests for bugs and previously failing scenarios.
- When changing shared services or interfaces, verify affected consumers
  rather than testing only the modified component.
- Do not weaken or remove existing assertions merely to make tests pass.
- When intentionally changing behavior, update affected tests and document
  the compatibility impact.

## Change verification

Choose checks in proportion to the change. For new behavior, run the relevant
unit and e2e tests plus lint and build; add integration, security, AI or
performance coverage when the behavior warrants it. Report commands actually
run, failures, and any checks not run with their reasons. Preserve existing API
behavior unless an explicit change requires otherwise.
