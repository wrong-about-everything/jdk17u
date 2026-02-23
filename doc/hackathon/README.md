# Staff-Level Distributed Systems Hackathon (Docker Compose, No Cloud)

This document defines a realistic, production-style hackathon format for senior/staff/principal engineers.
It is intentionally designed for trade-off reasoning under pressure, not for "one correct answer" execution.

## 1) Format (typical for senior+ architecture/production hackathons)

- **Duration:** 8 hours total (single day)
  - 0:00-0:45 — onboarding, architecture/context briefing
  - 0:45-3:00 — diagnostics and hypothesis building
  - 3:00-6:00 — implementation and verification
  - 6:00-7:00 — hardening, rollback plan, runbook updates
  - 7:00-8:00 — final presentation + Q&A
- **Teams:** 5 teams, 3-5 participants each
- **Roles expected in each team:** backend/platform, database, messaging/SRE, facilitator/presenter
- **Artifact model:** every decision must be evidence-backed (metrics, logs, traces, load-test output)

## 2) Scoring Rubric (100 points)

This scoring is common for production-oriented architecture competitions.

1. **Diagnosis quality (25):**
   - Correct identification of critical bottlenecks/failure modes
   - Evidence chain across logs + metrics + traces
2. **Solution quality (25):**
   - Fixes address root causes, not only symptoms
   - Change safety and failure-mode awareness
3. **Measured impact (20):**
   - Before/after with comparable load profile
   - SLO-oriented gains (latency/errors/lag)
4. **Operational readiness (15):**
   - Rollback strategy
   - Runbook/alerts/dashboards updated
   - Risk and blast-radius analysis
5. **Architecture rationale (10):**
   - Explicit trade-offs and alternatives considered
6. **Presentation clarity (5):**
   - Crisp narrative, KPI outcomes, next steps

## 3) Realistic Constraints (not artificial)

These are typical in real environments and avoid toy restrictions.

- **Time pressure:** 8-hour window, one deploy freeze in final 45 minutes (only rollback/hotfix)
- **Reliability guardrail:** no solution that increases error rate under baseline traffic
- **Data correctness:** no loss of financial/business events; duplicates allowed only with idempotency proof
- **Backward compatibility:** public API contracts must remain compatible for existing clients
- **Change governance:** every significant change must include rollback procedure
- **Observability requirement:** final solution must preserve/improve observability signal quality
- **Resource envelope:** solution should run on the provided compose host limits (CPU/memory capped)

## 4) System Under Test (reference blueprint)

- **Language/runtime:** Kotlin + Spring Boot (JDK 17)
- **Core components:**
  - `api-gateway` (HTTP ingress)
  - `order-service` (sync request handling + event publishing)
  - `pricing-service` (latency-sensitive dependency)
  - `fulfillment-worker` (Kafka consumer)
  - `notification-worker` (Kafka consumer)
  - `postgres` (primary transactional DB)
  - `kafka` + `kafka-ui`
  - `redis` (cache/idempotency key store)
- **Observability stack (compose):**
  - OpenTelemetry Collector
  - Prometheus + Alertmanager
  - Grafana
  - Loki + Promtail
  - Tempo (traces)

## 5) Mandatory SLOs and KPIs

Target values teams must optimize toward:

- API availability >= 99.9% during steady load
- API p95 latency < 250 ms, p99 < 600 ms for `POST /orders`
- HTTP 5xx rate < 0.5%
- End-to-end processing (`order accepted` -> `fulfilled`) p95 < 2.5 s
- Kafka consumer lag at steady state: < 5,000 messages per consumer group
- Rebalance events: no continuous rebalance loop under load
- Postgres saturation constraints:
  - active connections < 80% pool max
  - lock waits not continuously growing
  - slow query rate trending downward after fix

## 6) Workload Profile

Use k6 scripts in `doc/hackathon/k6`:

- **Steady test (20 min):** baseline 100 RPS mixed read/write
- **Spike test (10 min):** burst from 80 -> 400 RPS within 60 seconds
- **Soak test (45 min):** 120 RPS to expose leaks/contention/rebalance behavior

Traffic mix:

- 60% `POST /orders`
- 30% `GET /orders/{id}`
- 10% `POST /orders/{id}/cancel`

Payload conditions:

- 3% duplicate idempotency keys
- 1% malformed optional fields
- 5% "heavy" orders (10x line items)

## 7) Known Intentional Problem Classes (example package)

A Google-style staff-level challenge should include multiple interacting issues:

1. **Connection pool starvation** in `order-service` under retry storms
2. **N+1 query path** in order retrieval after a specific feature flag
3. **Kafka partition skew** causing one hot partition and lag buildup
4. **Consumer rebalance churn** due to long synchronous processing in poll loop
5. **Missing idempotency guard** for duplicate `POST /orders` under timeout/retry
6. **High-cardinality metrics labels** degrading Prometheus performance
7. **Unbounded in-memory cache** causing GC pressure and p99 cliffs
8. **Log correlation gaps** where async thread hops drop correlation id

## 8) Observability Requirements

### 8.1 Logging

- Structured JSON logs with required fields:
  - `@timestamp`, `level`, `service`, `env`, `traceId`, `spanId`, `correlationId`, `customerId`, `message`
- Pipeline:
  - app stdout/file -> Promtail -> Loki
- Query examples:
  - by `correlationId`
  - by `traceId`
  - by `service` + `level=ERROR`

### 8.2 Metrics (Grafana)

Required dashboard groups:

1. **Golden signals per service:** latency, traffic, errors, saturation
2. **External dependency latencies:** Postgres, Kafka producer/consumer, downstream HTTP
3. **Request/message duration:** per endpoint and per async processing stage
4. **JVM metrics:** CPU, heap/non-heap, GC pauses, threads, classloader, file descriptors
5. **Kafka:** lag, throughput, rebalance count, poll duration, commit latency
6. **Postgres:** connections, locks, cache hit ratio, slow queries, vacuum activity, disk IO

### 8.3 Tracing

- OpenTelemetry instrumentation enabled
- Mandatory span attributes: service name, endpoint/topic, tenant/customer (bounded cardinality)
- Must support trace-to-log correlation via `traceId`

## 9) Delivery Rules for Teams

Each team must submit:

1. Architecture decision log (what changed and why)
2. Git diff and commit history summary
3. Before/after KPI table from identical load runs
4. Risk register + rollback plan
5. 10-slide presentation (template in `doc/hackathon/templates`)

## 10) Evaluation Checklist (judges)

- Did the team prove root cause(s) with evidence?
- Did they improve SLO metrics without creating new severe regressions?
- Is data correctness preserved?
- Are rollback and operational procedures realistic?
- Are trade-offs explicit and defensible?
- Is the final story understandable to engineering leadership?

## 11) Local-Only Execution Standard (Fedora-friendly)

- Prefer running containers with host UID/GID mapping where possible
- Mount writable volumes under project-local `./var/*`
- Ensure permissions on mounted dirs are pre-created (`chmod g+rwX`), avoid root-owned artifacts
- Keep app logs on stdout plus optional file sink in mounted writable path
- For IDEA runs, use same config defaults as compose via `.env` and app profiles

## 12) Suggested Hackathon Scenario Pack (starter)

- **Scenario A:** Latency and saturation under spike
- **Scenario B:** Data correctness under retries and duplicates
- **Scenario C:** Event backlog and rebalance stability
- **Scenario D:** Cost/perf trade-off under constrained resources

Teams are free to change any layer (app, DB access, messaging config, compose sizing, retry/backoff, batching, caching), but must justify trade-offs and operational safety.
