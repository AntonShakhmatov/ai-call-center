# Security model

This document describes the current security posture and security requirements
for the planned cable TV voice support service. Requirements below are design
goals, not claims that the corresponding controls are implemented. See the
[architecture](architecture.md), [development guidelines](development-guidelines.md)
and [testing strategy](testing-strategy.md) for related design and verification.

## Current security posture

- HTTP endpoints and the `/voice` Socket.IO namespace have no authentication
  or authorization. The read-only call endpoints expose database records,
  including caller numbers and potentially conversation content.
- Subscriber identity verification, operator access, tenant isolation,
  auditing, retention enforcement and account integrations are not implemented.
- `GET /health` is a process liveness response, not a dependency readiness or
  security check. Conversation state is in memory and is not shared across
  instances or retained across restarts.
- Existing HTTP logging and exception handling can log request URLs and error
  stacks. Do not assume logs are redacted. The database can contain personal
  data even though call ingestion and recording are not implemented.
- Protect deployment access at the infrastructure boundary; do not expose the
  current service publicly with real call or subscriber data before appropriate
  application access controls are implemented.

## Identity and authentication

Future subscriber-specific workflows must verify identity using an approved
provider identity system before private information is disclosed or actions are
performed. Caller ID alone is not proof of identity. Verification should be
bound to the current conversation, subscriber, provider/tenant and an explicit
expiry; re-verification may be necessary for sensitive operations. Failed or
expired verification must not grant account access.

Operators and administrators need individual, authenticated identities, with
strong authentication appropriate to their privileges. Service-to-service
connections should use independently managed credentials and authenticated
channels. An AI agent is an application component, not an authenticated
subscriber or a substitute for a verified operator.

Authentication mechanisms, recovery procedures, session lifetimes and
integration providers remain to be selected and implemented.

## Authorization and access control

Authentication identifies an actor; it does not by itself grant access.
Enforce authorization in application code for each resource and operation,
including provider/tenant and subscriber scope. Deny access when identity,
scope or policy is missing, expired or uncertain.

| Actor | Intended access after appropriate verification | Restrictions |
| --- | --- | --- |
| Subscriber | Their own authorized account and service information, plus approved general information | No access to other subscribers or tenants; consequential changes require explicit confirmation and applicable policy checks. |
| AI agent | Minimum conversation context and approved tool capabilities needed for the current task | No direct database or unrestricted external access; tool calls are authorized independently of model decisions. |
| Human operator | Assigned or otherwise authorized calls and the minimum account and handoff context needed for support | Access is limited by role, tenant and assignment or other approved policy; sensitive operations require additional permissions and confirmation where applicable. |
| Administrator or service | Explicitly assigned operational or integration capabilities | Separate duties and least privilege; administrative access does not imply unrestricted access to subscriber content. |

Record verification and authorization decisions in trusted application state,
not in model-generated text or retrieved documents. Invalidate access on session
expiry, handoff or other policy-defined changes. Apply the same controls to HTTP,
Socket.IO, background jobs and internal tools as applicable. The exact role and
permission model is future work.

## Data protection

- Treat caller numbers, subscriber identifiers, transcripts, conversation
  messages and recordings as personal data. Minimize collection and access;
  specify purpose, retention and deletion rules before storing new data.
- Encrypt sensitive data in transit and at rest using managed, rotated keys and
  access-controlled secrets. Protect backups and apply equivalent retention and
  deletion policies to them where feasible.
- Do not collect or store payment credentials or sensitive payment details in
  transcripts, recordings, prompts or logs. Use an approved payment integration
  and data-handling design if payment functionality is introduced.
- Redact or minimize personal data in logs, traces, test fixtures, error
  responses and handoff context. Restrict access to recordings, transcripts and
  technical logs separately according to operational need.
- Do not send personal or confidential data to an external AI, speech or tracing
  provider without an explicitly reviewed data-handling policy covering purpose,
  retention, access and contractual requirements. Use synthetic data for
  development and evaluation.
- Define retention, deletion, correction and incident-response procedures with
  the responsible provider and applicable legal requirements. These controls
  are not currently implemented.

## LLM security

- Treat user messages, model outputs, retrieved documents and tool results as
  untrusted. Retrieved content is evidence, not an instruction or authorization.
- Enforce identity, authorization, business rules and tool permissions outside
  the model. Do not allow the model to execute arbitrary SQL, shell commands or
  unrestricted application operations.
- Limit the context sent to a model to what is required and authorized. Isolate
  tenant data and filter retrieval by source permissions; preserve provenance and
  freshness for evidence used in answers.
- Validate structured model output before use. When evidence is missing,
  contradictory or stale, clarify, abstain or escalate rather than inventing
  account facts, prices or outage status.
- Evaluate prompt injection, data leakage, unsupported answers and unsafe tool
  selection with adversarial synthetic cases. Models and RAG are not implemented
  today; their providers and controls require review before deployment.

## Tool security

- Expose narrowly scoped tools through application-owned interfaces. Validate
  and normalize parameters at the tool boundary, even when input comes from an
  already validated request or model output.
- Independently check actor identity, subscriber and tenant scope, permissions,
  current business rules and resource ownership before every sensitive call.
  Do not infer authorization from conversation text or a successful lookup.
- Require explicit, contextual confirmation before consequential actions such as
  package changes, cancellations or technician scheduling. Bind confirmation to
  the intended action and parameters, and invalidate it if they change.
- Use transactions where atomic persistence is needed. For external actions,
  use provider-supported idempotency keys where available and reconcile
  ambiguous outcomes instead of blindly retrying. Apply timeouts and bounded
  retries only to safe operations.
- Return structured, sanitized results and distinguish a negative result from a
  failed or unavailable provider. Audit sensitive access and actions without
  logging secrets or unnecessary personal data.

## Infrastructure security

- Restrict network access to the application, PostgreSQL, Redis, provider
  integrations and management interfaces. Use TLS for exposed and internal
  connections as appropriate; restrict database and cache credentials to the
  minimum required privileges.
- Store secrets in an approved secret manager or protected environment; rotate
  credentials and never commit them. The example and Compose database credentials
  are development defaults and must not be used for production.
- Patch and review dependencies, base images and deployment configuration.
  Limit container privileges and protect images, deployment pipelines and
  backups. Review dependency changes and monitor known vulnerabilities.
- Configure access limits, timeouts and resource quotas for externally reachable
  services. Monitor failures and abnormal use without exposing sensitive data.
  These measures require deployment-specific implementation and verification.

## Audit and compliance

- Define audit events for authentication, authorization failures, private-data
  access, tool actions, confirmations, operator handoffs and administrative
  changes. Capture actor, tenant, subject, action, outcome and timestamp, plus a
  correlation identifier where appropriate, without recording unnecessary
  content or secrets.
- Protect audit records from unauthorized access, alteration and deletion;
  define access, retention, review and incident-response procedures. Separate
  operational logs from security audit records where appropriate.
- Determine applicable privacy, telecommunications, recording consent, payment
  and retention obligations with the provider and qualified legal or compliance
  stakeholders. This document does not establish compliance with any specific
  regulation or standard.
- Audit event storage, retention controls, consent handling and compliance
  processes are not implemented in the current application.

## Threat model

The table describes representative risks and intended controls; it is not an
exhaustive assessment. Review it as integrations, deployment topology and data
flows change.

| Potential attacker or source | Abuse scenario | Intended protective measures |
| --- | --- | --- |
| Unverified caller | Impersonates a subscriber or uses caller ID to request account data | Verify identity independently; enforce per-account authorization and limit failed attempts. |
| Authenticated subscriber | Attempts to access another account or tenant, or replay a confirmation | Check ownership and tenant scope on every operation; bind confirmations to action and parameters. |
| Malicious caller or document author | Injects instructions to disclose data or misuse tools | Treat content as untrusted; enforce tool permissions outside the model; use adversarial evaluations. |
| Compromised or unauthorized operator | Browses unrelated calls or performs unauthorized changes | Individual authentication, least privilege, assignment-scoped access, confirmation and audit review. |
| Attacker accessing exposed infrastructure | Reads call records, steals secrets or alters infrastructure | Network restrictions, strong service credentials, TLS, least privilege, patching and monitoring. |
| Compromised provider or malformed response | Supplies false facts, leaks data or causes repeated actions | Minimize shared data, validate responses, use timeouts, provenance, idempotency and safe failure handling. |
| Automated abusive client | Exhausts connections or triggers expensive model/tool calls | Access controls, rate and resource limits, timeouts, monitoring and cost limits. |
| Insider or log reader | Extracts subscriber data from logs, traces, backups or recordings | Minimize and redact data, restrict access, encrypt storage and enforce retention and audit policies. |

## Verification

Add security tests with each relevant feature: identity and authorization
failures, cross-tenant access, malformed parameters, confirmation and replay,
provider failures, log redaction and prompt injection. Use controlled
dependencies and synthetic data. The existing e2e suite stubs Prisma and does
not establish real persistence or security guarantees; see the
[testing strategy](testing-strategy.md).

## Verification assurance

- Define verification levels according to the sensitivity of the requested
  information or operation.
- General public information must not require subscriber authentication.
- Private account information requires an established and currently valid
  verification state.
- High-risk operations may require additional verification or an independent
  confirmation step.
- Do not rely solely on caller ID, publicly available information or easily
  guessed personal details as proof of identity.
- Verification challenges must be rate-limited and protected against
  brute-force attempts and replay.

## Deployment restrictions

- The current application must not be exposed to untrusted networks while
  its HTTP and Socket.IO endpoints remain unauthenticated.
- Network-level restrictions are temporary defense-in-depth measures,
  not substitutes for application authentication and authorization.
- Production deployment with real subscriber data requires verified
  authentication, authorization, tenant isolation, secret management
  and appropriate data protection controls.
- Security-critical deployment requirements must be verified before
  enabling subscriber-facing functionality.

## Session and transport security

- Bind authenticated identity and verification state to a server-managed
  conversation session with explicit expiry.
- Do not trust subscriber identity, tenant identifiers, roles or verification
  flags supplied by Socket.IO clients.
- Authenticate Socket.IO connections and authorize individual events and
  room subscriptions according to the current session permissions.
- Revalidate access when session state changes, expires or is revoked.
- Prevent unauthorized clients from joining rooms or receiving events
  associated with other subscribers or conversations.
- Use secure session identifiers and prevent session fixation and replay.

## Voice data and recording consent

- Define whether calls are recorded, transcribed or processed in real time
  before enabling voice functionality.
- Provide required notices and obtain consent where applicable.
- Define separate retention and access policies for raw audio, transcripts
  and derived conversation metadata.
- Do not assume that permission to process a call automatically grants
  permission to retain or reuse its recording.
- Do not use subscriber recordings for model training or unrelated purposes
  without an explicitly approved legal and data-handling basis.