# Architecture

This document describes the intended architecture of `ai-voice-agent` and the
future realtime call flow. The codebase implements the module boundaries only;
the voice/LLM/telephony layers and business logic are planned next steps.

## Goals

- **Provider independence**: telephony (Twilio/Asterisk/…) and LLM providers
  (OpenAI/Anthropic/…) plug into adapter boundaries; domain code never depends
  on a specific provider.
- **Incremental development**: every layer is individually testable and can be
  built up in stages.
- **Realtime readiness**: a WebSocket gateway and a voice service boundary exist
  from the start so realtime audio can be added without restructuring.
- **Clear data split**: Redis holds ephemeral, active session state; PostgreSQL
  holds persistent call history and business data.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ REST API          calls/, analytics/, operators/             │
├─────────────────────────────────────────────────────────────┤
│ Realtime (WS)     voice/  VoiceGateway + VoiceService        │
├─────────────────────────────────────────────────────────────┤
│ Orchestration     orchestrator.service, conversation-state, │
│                   intent-router                             │
├─────────────────────────────────────────────────────────────┤
│ Agents            conversation/, faq/, reservation/, support│
├─────────────────────────────────────────────────────────────┤
│ Tools             menu/, opening-hours/, promotions/,       │
│                   reservation/, transfer/                   │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure    database/ (Prisma), cache/ (Redis),       │
│                   knowledge/, common/                       │
└─────────────────────────────────────────────────────────────┘
```

Dependency direction: higher layers depend on lower layers. `orchestration/`
depends on `agents/` and `tools/`; `agents/` never talks to the database or the
network directly — it goes through `tools/`.

## Intended future flow

The following is the target flow once speech recognition, LLM and telephony are
implemented. Steps marked *(future)* are not implemented yet.

```
Caller
  │  phone call                                          (future: telephony provider)
  ▼
Telephony Provider                                        (Twilio / Asterisk / …)
  │  realtime audio stream (WebSocket)                   (future)
  ▼
Voice Gateway  ──  voice/voice.gateway.ts                 (created)
  │
  ▼
Realtime Voice / AI Layer  ──  voice/voice.service.ts     (boundary created)
  │  ASR, VAD, LLM streaming, TTS                        (future)
  │  → transcribed user utterance + intent
  ▼
Orchestrator  ──  orchestration/orchestrator.service.ts   (created)
  │  keeps conversation state                             (Redis-backed in future)
  │  routes intent via intent-router
  ▼
Agent  ──  agents/*.ts                                    (scaffolded)
  │  selects the answer / action, never touches the DB directly
  ▼
Tool  ──  tools/*.ts                                      (scaffolded)
  │  only way agents reach the outside world
  ▼
Business API / Database  (menu, opening hours, promotions, reservations)
  │
  ▼
Agent  (composes the reply from tool results)
  │
  ▼
Voice Layer  (TTS → audio back over the WebSocket)        (future)
  │
  ▼
Caller
```

### Human handoff (transfer)

```
Agent decides the call should be handled by a person
  │  e.g. low intent confidence, customer request, policy
  ▼
Orchestrator requests transfer  (OperatorTransfer domain type)
  │
  ▼
operators/  → reserve an available human operator        (scaffolded)
  │
  ▼
Voice Layer  → conference/blind-transfer via Telephony    (future)
  │
  ▼
Human operator talks to the caller
  │  AI keeps transcribing for handoff context (optional)
  ▼
Call recorded → PostgreSQL (Call, Conversation, ConversationMessage)
  analytics/ → transcripts and metrics                   (scaffolded)
```

## Data model

Persistent (PostgreSQL, Prisma):

- **Call** — a telephone call: direction, status lifecycle, timestamps. Related
  to exactly one `Conversation`.
- **Conversation** — the AI/customer dialog for a call, with messages.
- **ConversationMessage** — one exchange (`USER`, `AGENT`, `SYSTEM` role).

Ephemeral (Redis, planned):

- Active conversation state (phase, current intent, pending tool, metadata).
- Active call registry across replicas for routing/analytics.
- Presence of human operators.

Domain types in `src/domain/types.ts` (`Call`, `Conversation`,
`ConversationMessage`, `ConversationState`, `Intent`, `Agent`, `Tool`,
`ToolResult`, `OperatorTransfer`) mark the boundary between domain concepts and
infrastructure. They are intentionally not over-modeled yet.

## Conventions

- Controllers contain no business logic.
- Telephony and LLM provider SDKs live behind boundaries, never in domain code.
- No multi-agent framework (LangGraph/CrewAI) — orchestration stays in-house.
- Interfaces are introduced only where they represent a real architectural
  boundary, to avoid premature abstraction.

## Planned evolution

1. Redis-backed `ConversationStateService`.
2. Provider-agnostic LLM adapter (`Transcriber`, `TextToSpeech`, `IntentRecognizer`,
   `Generator` interfaces) with OpenAI/Anthropic implementations behind it.
3. Wire `intent-router` to real agent registrations.
4. Implement tools per business domain.
5. Telephony WebSocket media + VAD/ASR/TTS pipeline.