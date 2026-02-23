# Hackathon Final Presentation Template (10 Slides)

## Slide 1 — Context and Goals
- Team name and members
- Initial system state
- SLO targets in scope

## Slide 2 — Symptoms and Impact
- User-visible failures/degradation
- Business impact hypothesis
- Why this is priority #1

## Slide 3 — Investigation Method
- Metrics, logs, traces, load profile used
- Correlation approach (`correlationId`, `traceId`)
- Decision timeline

## Slide 4 — Root Cause #1 (Evidence)
- Graphs + trace snippets + log queries
- Why alternatives were ruled out

## Slide 5 — Root Cause #2 / Contributing Factors
- Cross-layer interaction (app/DB/Kafka/infra)
- Failure mode under load

## Slide 6 — Changes Implemented
- Code/config/infra changes
- What was intentionally not changed
- Compatibility considerations

## Slide 7 — Before/After Results
- Latency, error rate, throughput
- Consumer lag and rebalance behavior
- Postgres lock/slow query trends

## Slide 8 — Trade-offs and Risks
- Chosen compromises
- Residual risks and mitigations
- Operational cost implications

## Slide 9 — Rollback and Runbook
- Rollback triggers and steps
- Alerts added/updated
- On-call playbook notes

## Slide 10 — Next Iteration Plan
- Follow-up improvements
- Validation plan for production rollout
- Open questions for architecture review
