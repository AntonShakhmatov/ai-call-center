# AI development tools plan

This document proposes development and evaluation tools for the cable TV voice
support platform. These are recommendations, not existing integrations. The
current implementation and intended product architecture are described in the
[README](../README.md) and [architecture](architecture.md).

## Objectives

- Develop provider-independent LLM, speech and telephony adapters incrementally.
- Evaluate intent routing, grounded answers, tool selection and human escalation
  using repeatable, synthetic scenarios.
- Debug latency and failures across the eventual voice and agent pipeline.
- Keep personal data out of development fixtures and control the data sent to
  external providers and tracing systems.
- Extend the existing NestJS, TypeScript, Jest and PostgreSQL stack where useful.

## Proposed toolset

| Need | Recommendation | Planned use |
| --- | --- | --- |
| AI-assisted development | OpenCode with a model of the team's choice | Assist with implementation, review and documentation. |
| LLM integration | Official TypeScript SDK for the initial provider, behind a project-owned interface | Implement and compare model providers without coupling orchestration or domain types to one SDK. |
| Prompt and agent evaluation | Promptfoo | Run version-controlled cases for intent recognition, grounding, tool selection and escalation locally and in CI. |
| AI tracing | Langfuse, optionally self-hosted | Inspect model calls, tool calls, latency and failures; apply redaction and retention controls before real subscriber data is used. |
| Retrieval experiments | PostgreSQL with pgvector | Prototype embeddings and retrieval using the existing PostgreSQL stack when RAG development starts. |
| Speech development | Selected speech provider SDKs and recorded audio fixtures | Test transcription and synthesis adapters independently before connecting telephony. |
| Application testing | Existing Jest and Supertest | Test deterministic routing, adapter contracts, HTTP behavior and integration failures. |

No LLM, speech, retrieval, evaluation or tracing provider is currently
integrated. Choose providers after confirming language coverage, latency, cost,
data handling and deployment requirements. These tools do not require adopting a
multi-agent framework; the architecture currently plans in-house orchestration.

## Evaluation plan

Create a version-controlled suite of synthetic cable TV support scenarios:

1. **Intent routing:** classify package, billing, missing-signal, outage and
   human-operator requests, including ambiguous inputs.
2. **Grounding:** answer using supplied approved documents and abstain or
   escalate when evidence is missing, outdated or contradictory.
3. **Tool selection:** use authoritative sources for current prices and outages;
   avoid account lookups for general FAQ questions.
4. **Authorization and confirmation:** check that private account data is not
   disclosed before verification and consequential actions require confirmation.
5. **Failure handling:** distinguish a negative result from an unavailable
   integration and offer human escalation where appropriate.
6. **Voice:** once adapters exist, assess transcription accuracy and end-to-end
   latency with representative audio fixtures, including noisy recordings.

Use Promptfoo for model-dependent scenarios and Jest for deterministic
contracts and business rules. Record expected outcomes, model and prompt
versions, and evaluation results so changes can be compared. Use synthetic
accounts and conversations; avoid real subscriber data in fixtures.

## Development phases

1. **Foundation:** define synthetic scenarios and select an initial LLM provider.
   Store credentials in environment variables, not source control.
2. **LLM adapter:** implement a project-owned provider interface and evaluate
   intent recognition and response behavior. Keep provider SDKs at the adapter
   boundary.
3. **RAG prototype:** evaluate document ingestion, chunking, embeddings and
   retrieval with PostgreSQL/pgvector. Measure retrieval relevance, source
   provenance and abstention before using results for subscriber answers.
4. **Observability:** add tracing for model and tool calls, latency and errors.
   Define access, redaction and retention settings before tracing real calls.
5. **Speech and telephony:** select speech adapters, build audio fixtures and
   measure transcription and pipeline latency before integrating live calls.
6. **Continuous evaluation:** run deterministic tests on every change and a
   controlled model evaluation set in CI. Pin model versions where available,
   set cost and timeout limits, and review model-dependent regressions.

The proposed knowledge search, subscriber lookup, billing, service-status and
operator-transfer tools in [architecture.md](architecture.md#agents-and-tools-planned)
are future **application capabilities**. They are distinct from the development
and evaluation tools in this plan and are not implemented today.
