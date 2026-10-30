# Architecture

This document describes the intended architecture of `ai-voice-agent`, an
AI-powered voice support assistant for cable television subscribers. The codebase currently implements module boundaries, configuration,
Prisma-backed read access to call records, and a WebSocket connection
skeleton only. Telephony, speech, LLM, RAG,
subscriber and business-system integrations are planned.

## Goals

- **Cable TV subscriber support**: answer questions about packages, channels,
  billing, installation, troubleshooting, outages and service policies, and
  escalate account-specific or unresolved issues to a human.
- **Provider independence**: telephony and LLM providers plug into adapter
  boundaries; domain code never depends on a specific vendor.
- **Incremental development**: every layer is individually testable and can be
  built up in stages.
- **Realtime readiness**: a WebSocket gateway and voice service boundary exist
  from the start so realtime audio can be added without restructuring.
- **Clear data split**: Redis is intended for ephemeral active session state;
  PostgreSQL holds persistent call history. General knowledge, live operational
  data and private subscriber data must not be mixed.
- **Safe operations**: private data requires authentication and authorization;
  consequential account changes require explicit confirmation.

## Current implementation status

| Area | Status |
| --- | --- |
| HTTP API | `GET /health` is a process liveness response, not a dependency check; `GET /calls` and `GET /calls/:id` are read-only Prisma queries |
| Realtime | `VoiceGateway` in the `/voice` Socket.IO namespace logs connect/disconnect only; clients use the default `/socket.io/` transport path |
| Voice processing | `VoiceService` boundary exists; ASR, TTS, VAD and streaming are not implemented |
| Orchestration | `OrchestratorService`, `ConversationStateService` and `IntentRouterService` exist; agent registry is empty and state is in-memory |
| Agents | `AgentsModule` scaffold only |
| Tools | `ToolsModule` scaffold only |
| Knowledge / RAG | `KnowledgeModule` boundary only |
| Human handoff | `OperatorsModule` scaffold and the `OperatorTransfer` domain type only |
| Analytics | `AnalyticsModule` scaffold only |
| Persistence | Prisma models and initial migration for `Call`, `Conversation`, `ConversationMessage` |
| Authentication | None on HTTP or WebSocket endpoints |

No agent, tool, retrieval pipeline, subscriber lookup, billing, outage, ticket or
scheduling integration exists.

## Cable TV subscriber support use case

The platform is intended for incoming support calls from subscribers of a cable
television provider. A call may concern general provider information, live
operational status or a specific subscriber account. These categories have
different trust and access requirements.

| Category | Examples | Intended source |
| --- | --- | --- |
| General provider knowledge | Package descriptions, channel lineups, FAQ articles, equipment manuals, troubleshooting procedures, contract and service policies, approved support scripts | Future RAG over approved, versioned provider documentation |
| Frequently changing operational information | Current outages, maintenance notices, service availability, live pricing and eligibility rules | Authoritative provider APIs or databases, not a stale document index |
| Private subscriber information | Identity and authentication status, subscribed packages, account status, invoices, payment state, support tickets, technician appointments | Authenticated, authorized account-specific systems |
| Call and conversation history | Call lifecycle, messages and transcripts | PostgreSQL |

General knowledge may be handled by RAG. Operational facts must be retrieved from
authoritative systems at the time of the call. Private subscriber information
must never be served from an unrestricted semantic index.

## Layers and dependency direction

```
REST API / Realtime ingress       calls/, voice/, analytics/, operators/
                |
                v
Orchestration                     orchestrator, conversation state, intent router
                |
                v
Agents (planned)                  conversation, FAQ/knowledge, account,
                                  troubleshooting, human handoff
                |
                v
Tools (planned)                   knowledge search and business operations
                |
                v
External systems (future)         subscriber/CRM, billing, service status,
                                  ticketing, scheduling, telephony, LLM providers

Infrastructure                    PostgreSQL, Redis, configuration, logging
```

The diagram describes the intended dependency direction: higher layers depend
on lower layers. Orchestration is intended to coordinate agents and tools;
agents should never talk to the database, a
vector index or an external API directly — they go through `tools/`. Controllers
contain no business logic. The `domain/` package holds shared types and must not
depend on infrastructure.

| Module | Responsibility | Current state |
| --- | --- | --- |
| `app/`, `config/`, `common/` | Bootstrap, validated configuration, logging, exception handling | Implemented foundation |
| `calls/` | REST access to persistent call history | Implemented read-only |
| `voice/` | Realtime ingress and the voice-processing boundary | Gateway logs connections; processing is planned |
| `orchestration/` | Conversation state, intent routing and coordination | Skeleton; in-memory state, empty agent registry |
| `agents/` | Specialized cable TV support agents | Scaffold |
| `tools/` | The only path from agents to external capabilities | Scaffold |
| `knowledge/` | Future ingestion and retrieval (RAG) boundary | Scaffold |
| `operators/` | Operator availability, presence and handoff | Scaffold |
| `analytics/` | Transcripts, metrics and reporting | Scaffold |
| `database/`, `cache/` | Prisma/PostgreSQL and Redis access | Implemented services; Redis is not yet used for conversation state |
| `domain/` | Shared domain types | Implemented types only |

## Intended RAG architecture

`knowledge/` is the boundary for a future retrieval-augmented generation
subsystem. The following flow is planned and is not implemented:

1. **Ingest** approved provider documentation, FAQs, channel lists, package
   descriptions, troubleshooting guides, service policies, equipment manuals and
   other relevant reference materials.
2. **Normalize and split** documents into searchable chunks, preserving source
   identity, version and section metadata.
3. **Generate embeddings** and index the chunks in a retrieval store.
4. **Retrieve** relevant evidence for a subscriber's question.
5. **Provide evidence and source metadata** to the appropriate agent.
6. **Generate a concise answer** grounded in the retrieved evidence.
7. **Abstain, clarify or escalate** when evidence is missing, ambiguous,
   outdated or contradictory.

Potential RAG content:

- FAQ articles.
- TV package and channel documentation.
- Equipment manuals.
- Troubleshooting procedures.
- Service policies and contract documentation.
- Approved support scripts.

Boundary rules:

- Do not store sensitive subscriber records in a shared vector index without an
  explicit access-control design.
- Enforce tenant/provider isolation if the platform serves multiple providers.
  Retrieval should filter by provider/tenant and document ACL metadata.
- Keep source freshness and provenance: source identifier, version, effective
  date, retrieval timestamp and chunk location should accompany evidence.
- Distinguish documented policy from live operational facts. A channel lineup
  document may explain package rules, but an outage or current price must come
  from an authoritative system.
- Retrieved evidence is input to an agent, not a substitute for authorization.
- PostgreSQL with pgvector may be considered as a future option. No vector
  database, embedding provider or LLM provider is currently a dependency.

## Agents and tools (planned)

All agents and tools below are proposed logical responsibilities. No individual
agent or tool class is implemented. Existing domain types (`Agent`, `Tool`,
`ToolResult`) and the empty intent-router registry mark the intended boundary.

Proposed agents:

| Agent | Intended responsibility |
| --- | --- |
| Conversation Agent | Greeting, clarification, conversation flow and fallback responses |
| FAQ / Knowledge Agent | Answer general provider questions from retrieved evidence |
| Subscriber Account Agent | Handle authenticated subscription, billing and account requests |
| Technical Troubleshooting Agent | Guide signal, equipment and setup troubleshooting; escalate unresolved faults |
| Human Handoff / Support Agent | Prepare and coordinate transfer to a human operator |

Proposed tools:

| Tool | Intended purpose | Primary source / constraint |
| --- | --- | --- |
| `KnowledgeSearchTool` | Retrieve approved provider evidence with source metadata | Future RAG index; tenant/ACL filtered |
| `ChannelLineupTool` | Look up channel lineups and package requirements | Authoritative catalog or approved documentation |
| `PackageInformationTool` | Look up package contents, prices and eligibility | Authoritative catalog; live pricing must not come from stale docs |
| `SubscriberLookupTool` | Identify a subscriber and retrieve subscriptions/account status | Authenticated, authorized account system |
| `BillingInformationTool` | Retrieve invoices, balances and payment status | Authenticated, authorized billing system |
| `ServiceStatusTool` | Check outages and service availability for an area | Authoritative real-time service-status system |
| `TroubleshootingTool` | Run supported diagnostic steps or record outcomes | Approved procedures; may require account/service context |
| `SupportTicketTool` | Create or update a technical support ticket | Authenticated, authorized ticketing system |
| `TechnicianSchedulingTool` | Schedule or change a technician visit | Authenticated, authorized scheduling system; explicit confirmation |
| `OperatorTransferTool` | Initiate handoff with conversation context | Operator system and telephony adapter |

Tool expectations:

- Validate inputs and authorization before any account-specific lookup or
  change.
- Require explicit confirmation before consequential operations such as package
  changes, ticket creation with commitments, or technician scheduling.
- Use bounded timeouts and return structured errors rather than leaking raw
  provider failures.
- Avoid logging secrets, tokens, payment details or unnecessary personal data.
- Return provenance and timestamps for retrieved operational facts.

Agents select tools and compose responses; they do not access Prisma, Redis,
external APIs or the retrieval store directly.

## Intended call flow

The following is the target flow. The status column reflects the current
repository, not the target design.

| Step | Stage | Status |
| --- | --- | --- |
| 1 | A subscriber calls the provider's support number. | Planned |
| 2 | A future telephony adapter establishes the call and streams audio. | Planned |
| 3 | The voice layer converts speech into text (ASR). | Planned |
| 4 | The orchestrator identifies the subscriber's intent. | Orchestrator skeleton exists; intent recognition is planned |
| 5 | The appropriate agent selects a knowledge retrieval or business tool. | Planned |
| 6 | The system retrieves verified information or performs an authorized operation. | Planned |
| 7 | The LLM formulates an answer using the available evidence. | Planned |
| 8 | The voice layer synthesizes the answer and sends audio back to the subscriber (TTS). | Planned |
| 9 | The conversation and call lifecycle are persisted. | Prisma models exist; ingestion is planned |
| 10 | If necessary, the orchestrator initiates human handoff. | Planned |

The current `VoiceGateway` only logs Socket.IO connections and disconnections.
`OrchestratorService` can store a supplied intent and ask `IntentRouterService`
for a route. The router supports explicit registration and matches intent names
against an agent's `supportedIntents`, but no agents are registered by default
and routing does not execute an agent or produce a reply.

### Example questions and required sources

| Subscriber question | Suitable handling |
| --- | --- |
| "Why is channel X unavailable?" | RAG for package/channel rules; `ServiceStatusTool` for a live outage; account lookup only if the question is package-specific |
| "Which channels are included in my package?" | Authenticated `SubscriberLookupTool` plus `ChannelLineupTool`/`PackageInformationTool`; general lineup questions may use RAG |
| "How can I troubleshoot a missing TV signal?" | RAG troubleshooting procedure, followed by `ServiceStatusTool`; `SupportTicketTool` or `TechnicianSchedulingTool` if unresolved |
| "Is there an outage in my area?" | Authoritative `ServiceStatusTool`; may require a verified service address or account context |
| "How much does it cost to add another package?" | Authoritative `PackageInformationTool` for current price and eligibility; authenticated account lookup for subscriber-specific offers |
| "Can I speak to a human operator?" | Direct human handoff; no RAG or business lookup required |

Questions about published policies and procedures are good RAG candidates.
Questions about current outages, prices, availability or a specific account are
not: they require authoritative, real-time systems and, for private data,
authenticated access.

## Human handoff and conversation context

A transfer to a human support operator is intended when:

- The subscriber explicitly requests a human.
- The issue cannot be resolved through the supported tools.
- Retrieved information is insufficient, outdated or conflicting.
- An account-specific or technical problem requires escalation.
- An operation fails or requires human authorization.

Planned flow:

```
Agent or orchestrator decides the call needs a person
  |
  v
Orchestrator requests transfer using OperatorTransfer
  |
  v
operators/ reserves an available human operator            (planned)
  |
  v
Voice layer performs a conference or blind transfer        (planned)
  |
  v
Human operator receives the call and context
```

The existing `OperatorTransfer` domain type contains `conversationId`, `callId`,
an optional `reason` and `requestedAt`. The orchestrator is the intended owner of
the transfer decision. `OperatorsModule` is currently an empty scaffold; operator
presence, reservation and telephony transfer are not implemented.

To make handoff useful, the system should be able to provide the operator with:

- Call and conversation identifiers.
- A concise conversation summary and the recent transcript.
- Detected intent, entities and unresolved questions.
- Identity-verification and authorization status.
- Tool calls, results and any failed operations.
- Retrieved evidence with source metadata and timestamps.
- The subscriber's requested action and any confirmations already given.

Conversation context should be minimized and redacted according to policy before
it is exposed to an operator or stored beyond the configured retention period.
Optional continued transcription during a human-handled call is a future
decision, not current behavior.

## Authentication and authorization boundaries

No authentication or authorization is implemented today. The following are
requirements for future work:

- Verify subscriber identity before disclosing private account, billing or
  service information. Caller ID alone should not be treated as proof of
  identity.
- Authorize every account-specific lookup and operation against the
  authenticated subscriber, account and provider/tenant.
- Require explicit confirmation before consequential changes such as package
  changes, cancellations, ticket creation with commitments, or technician
  scheduling.
- Protect personal data, billing information, call recordings and transcripts.
  Avoid logging secrets, authentication tokens, payment details or unnecessary
  sensitive information.
- Isolate tenants and subscribers in storage, retrieval, caching and logs.
- Record audit events for account access and consequential actions, including
  actor, subject, action, result and timestamp.
- Define retention and deletion policies for recordings, transcripts and
  conversation metadata; keep sensitive data only as long as required.
- Treat `callerNumber` and conversation content as personal data in the current
  schema.

## Reliability and source trust

Planned reliability requirements:

- Apply timeouts to external calls and bounded retries only for safe,
  idempotent operations.
- Fall back gracefully when a subscriber, billing, outage, ticketing or
  scheduling system is unavailable; explain the limitation and offer human
  handoff rather than guessing.
- Validate tool inputs and outputs; treat missing, stale or contradictory
  evidence as a reason to clarify, abstain or escalate.
- Do not make unsupported promises about outages, prices, service availability
  or resolution times.
- Preserve source provenance and retrieval timestamps so answers can be audited.
- Make account-changing operations idempotent where possible and avoid repeating
  them after ambiguous failures.
- Keep a clear distinction between a failed tool call and a negative business
  result (for example, "no outage found" versus "outage system unavailable").

## Data model

Persistent (PostgreSQL, Prisma):

- **Call** — a telephone call: direction (`INBOUND`/`OUTBOUND`), status
  (`RINGING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `TRANSFERRED`), optional
  caller number, timestamps. Related to at most one `Conversation`.
- **Conversation** — the AI/customer dialog for a call, with messages.
- **ConversationMessage** — one exchange (`USER`, `AGENT`, `SYSTEM` role) with
  content and timestamps.

Each conversation belongs to one call, and each message belongs to one
conversation. Deleting a call cascades to its conversation and messages. The
schema supports these records, but no application path currently writes them.

There are no subscriber, account, package, channel, billing, outage, ticket or
technician entities in the current schema. Those must not be documented as
existing until migrations add them.

Ephemeral (Redis, planned):

- Active conversation state (phase, current intent, pending tool, metadata).
- Active call registry across replicas for routing and analytics.
- Presence of human operators.

`ConversationStateService` currently stores state in an in-memory `Map`. The
Redis service exists but is not wired into conversation state, so state does not
survive a process restart and is not shared across replicas.

Domain types in `src/domain/types.ts` (`CallRecord`, `Conversation`,
`ConversationMessage`, `ConversationState`, `Intent`, `Agent`, `Tool`,
`ToolResult`, `OperatorTransfer`) mark the boundary between domain concepts and
infrastructure. They are intentionally not over-modeled yet.

## Conventions

- Controllers contain no business logic.
- Agents do not access databases, vector indexes or external APIs directly; they
  use tools.
- Telephony and LLM provider SDKs live behind boundaries, never in domain code.
- Business operations validate inputs and authorization in the tool layer.
- No multi-agent framework (LangGraph/CrewAI) — orchestration stays in-house.
- Interfaces are introduced only where they represent a real architectural
  boundary, to avoid premature abstraction.
- Documentation must distinguish implemented behavior, existing boundaries and
  future plans.

## Incremental milestones

1. Redis-backed `ConversationStateService`.
2. Provider-agnostic LLM and speech adapters (`Transcriber`, `TextToSpeech`,
   `IntentRecognizer`, `Generator`) behind interfaces.
3. Wire `IntentRouterService` to registered cable TV support agents.
4. Implement the first tools with input validation and authorization boundaries.
5. Add knowledge ingestion, embeddings, retrieval and `KnowledgeSearchTool` with
   source provenance and tenant isolation.
6. Add authenticated subscriber, billing, service-status, ticketing and
   technician-scheduling integrations.
7. Implement operator presence and human handoff with conversation context.
8. Add telephony WebSocket media streaming and the ASR/TTS pipeline.
9. Persist transcripts, add retention controls and build analytics.
