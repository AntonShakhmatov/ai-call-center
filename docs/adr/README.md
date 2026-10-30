# Architecture Decision Records

Architecture Decision Records (ADRs) capture significant architectural
decisions, their context, trade-offs and consequences. They give developers a
short history of why the system is designed as it is.

## Rules

- Create an ADR when a significant architectural decision is made, not for
  every code change.
- Once adopted, do not rewrite an ADR retroactively. Preserve the original
  decision and its context as a historical record.
- If a decision changes, create a new ADR that references the previous one.
  Update the old ADR's status to **Superseded** and link to the new record.
- Describe actual trade-offs, constraints and consequences, including drawbacks
  and unresolved questions. Do not present a preferred option as cost-free.
- Clearly distinguish proposals, approved decisions and implementation status.
  A proposal that has not been approved or implemented must not be described as
  an established architectural fact. Approval alone does not mean a decision has
  been implemented.
- Keep each ADR concise enough for a developer to understand within a few
  minutes. Link to supporting material rather than copying lengthy analysis.

## Naming and status

Use sequential, zero-padded filenames such as `0001-short-decision-title.md`.
Choose the next available number when adding a record. Use these statuses:

- **Proposed** — under consideration, not yet approved.
- **Accepted** — approved; describe implementation status separately.
- **Rejected** — considered but not adopted.
- **Superseded** — replaced by a later ADR; link to that record.

Update a record's status and replacement link when its lifecycle changes; do
not silently revise its historical rationale or decision.

## Template

Use [template.md](template.md) as the starting point for a new ADR. Describe
implementation status separately from the decision status when applicable.

Use **Supersedes** and **Superseded by** links where applicable so the decision
history can be followed in both directions.
