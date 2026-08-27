---
title: "Code Generation"
weight: 4
description: "/camel-execute — Phase 3: Orchestrated execution with adversarial and staged review"
---

## Overview

`/camel-execute` is the Phase 3 orchestrator that transforms a ready implementation plan derived from the approved design into generated code and review evidence. Through wave-based execution, pre-implementation catalog research, internal skill loading, an adversarial pre-filter, ordered spec and quality review, and a final cross-cutting review, the AI generates Camel routes, tests, and configuration files. Tasks in one wave run concurrently only on targets that support independent conversations; other targets preserve the same wave order sequentially.

The output is a runtime-specific project with YAML routes, Citrus tests, application properties, and `docs/camel-kit/<pipeline-id>/execution-report.md`. Spring Boot and Quarkus targets also receive Maven build files; Docker Compose is generated only when the integration needs external services.

## When to Use

Invoke `/camel-execute` when you:

- Have an Implementation Plan from `/camel-plan`
- Want to generate code based on the task breakdown
- Need to implement the entire integration in one orchestrated run

**Auto-invocation:** In a chained pipeline, `/camel-plan` automatically invokes `/camel-execute`. There is no separate plan approval gate — the design approval covers all downstream work. A directly invoked `/camel-plan` stops after writing its plan, so you can then invoke `/camel-execute <pipeline-id>` explicitly.

**Environment Probe:** Before dispatching any implementers, `/camel-execute` generates a throwaway skeleton appropriate to the selected runtime and runs the applicable checks. Maven dependency resolution runs for Spring Boot and Quarkus and is reported as skipped for Camel Main; runtime startup uses the selected runtime's command. Docker service checks run only when the design needs external services and Docker is available; unavailable Docker-dependent checks are also reported as skipped. This catches feasibility issues before any code is generated. If the probe finds an architectural problem (e.g., a component doesn't exist for the target runtime), it triggers automatic re-planning to adjust only the affected flow sections of `design-spec.md`.

## Input: Implementation Plan

`/camel-execute` reads the Implementation Plan from `docs/camel-kit/<pipeline-id>/implementation-plan.md` (created by `/camel-plan`).

The executor analyzes:
- **Task list** - What to implement
- **Acceptance criteria** - How to validate each task
- **Wave analysis** - Dependency order and tasks that are safe concurrency candidates
- **Component requirements** - Which Camel components per task
- **Review specifications** - Adversarial pre-filter followed by spec-compliance and code-quality review per task

## The Execution Process

The AI transforms the Implementation Plan into code and reports through wave-based execution with continuous review.

Before each wave, it deduplicates the components, EIPs, data formats, and languages referenced by that wave and runs the `catalog-researcher` role. The resulting MCP verification summary is passed to every implementer; missing artifacts must be replaced before YAML generation.

{{< tabs id="execution-stages" >}}
<!--tab Implement-->
## Implementation Per Task

For each task (respecting wave order), the executor dispatches the persona and guides
declared by the plan. Route and configuration tasks load `camel-implement`; test
tasks load `camel-test`. Each task receives:

- Task description
- Acceptance criteria
- Component list (from the plan)
- Design Specification (context)

**Example: Task 1 (REST Endpoint)**

### Step 1: Wave Analysis Parsing

The executor parses the wave analysis to determine execution order.

**Example Plan (selected route tasks):**
```markdown
## Wave Analysis

Wave 1:
- Task 1: REST Endpoint

Wave 2 (Sequential, depends on Wave 1):
- Task 2: Validation

Wave 3 (Parallel, depends on Wave 2):
- Task 3: Credit Lookup
- Task 7: Kafka Invalid Publisher

Wave 4 (Sequential, depends on Wave 3):
- Task 4: Routing Decision

Wave 5 (Parallel, depends on Wave 4):
- Task 5: Kafka Warehouse Publisher
- Task 6: Kafka Pending Publisher
```

**Execution Strategy on a target with concurrent subagents:**
```
Execute Wave 1 (Task 1)
  → Wait for completion
Execute Wave 2 (Task 2)
  → Wait for completion
Execute Wave 3 (Tasks 3 + 7 in parallel)
  → Wait for both to complete
Execute Wave 4 (Task 4)
  → Wait for completion
Execute Wave 5 (Tasks 5 + 6 in parallel)
  → Wait for both to complete
```

The example omits separate scaffold, configuration, runtime-dependency, test, and
conditional infrastructure tasks from the full plan. On a single-conversation
target, the same tasks run sequentially in plan order within each wave. All targets
wait for a complete wave before starting the next one.

### Step 2: Internal Skill Composition

During execution, the orchestrator composes three internal skills:

**camel-implement** - Route generation skill
- Generates Camel YAML routes from task specifications
- Uses route templates and follows the Constitution
- Handles route structure, naming, observability

**camel-test** - Test generation skill
- Creates Citrus integration tests
- Generates test scenarios from acceptance criteria
- Handles mocking and assertions

**camel-verify** - Runtime verification skill
- Builds the generated application
- Runs Citrus integration tests
- Classifies failures and routes targeted fixes

These skills are internal and have no generated command stubs. Static quality validation is the next public pipeline stage, `/camel-validate`.

### Catalog-Verified Route Generation

The `camel-implement` skill generates each route from the approved task and the catalog-research summary. It validates
the resulting YAML against the selected Camel runtime before accepting the task. Endpoint options, response handling,
configuration placeholders, asynchronous hand-offs, and observability therefore come from the approved design and
catalog rather than from a fixed sample route.

<!--tab Adversarial Review-->
## Adversarial Code Review Pre-Filter

After implementation, the executor selects the applicable critic lanes. Targets that support nested moderator dispatch use a fresh moderator and fresh critics. Targets such as Bob 2, Qwen, and OpenCode keep orchestration in the parent: it makes bounded reviewer calls for the selected lanes and synthesizes their evidence itself. Single-conversation targets apply the same lenses sequentially and record the missing isolation; Bob 1 does so in its monolithic execute gate.

- **PASS** or **PASS_WITH_TRADEOFFS** proceeds to Stage 1, carrying any documented trade-offs forward.
- **FAIL** returns verified findings to the implementer for remediation, then repeats the adversarial review before staged review begins.

This pre-filter does not replace the ordered stages below: spec compliance must still pass before code quality.

<!--tab Spec Review-->
## Stage 1: Spec Compliance Review

The executor validates the generated route against the task's acceptance criteria.

**Validation Checklist:**

```
Task 1 Acceptance Criteria:
✓ REST endpoint listens on port {{rest.port}} (externalized config)
✓ Accepts POST requests at /api/orders
✓ Expects JSON payload with orderId, customerId, items, totalAmount
✓ Returns HTTP 202 Accepted immediately (fire-and-forget)
✓ Passes order to internal SEDA queue for async processing
✓ No business logic in this route (separation of concerns)

Spec Compliance: PASS
```

If any criterion fails:

```
✗ Returns HTTP 202 Accepted immediately
  Found: HTTP 200 OK

Spec Compliance: FAIL
Regenerating route...
```

The executor invokes `camel-implement` again with the actionable findings and re-runs spec review for at most three iterations. If findings still remain, it escalates instead of continuing indefinitely.

<!--tab Quality Review-->
## Stage 2: Code Quality Review

After spec compliance passes, the executor validates against the Constitution.

**Constitution Checklist:**

```
Constitution Rule 1 (Route Structure): ✓ PASS
  - Route declares a source and a sink; pass-through processing is intentional

Constitution Rule 2 (Single Responsibility): ✓ PASS
  - Route has one responsibility: receive and queue orders

Constitution Rule 3 (Separation of Concerns): ✓ PASS
  - No business logic in REST endpoint route

Constitution Rule 4 (Naming Conventions): ✓ PASS
  - Route ID: order-reception-rest (kebab-case)

Constitution Rule 5 (Observability): ✓ PASS
  - Route ID: order-reception-rest
  - Description: Receive and enqueue orders

Constitution Rule 6 (External Configuration): ✓ PASS
  - REST port from {{rest.port}} property

Constitution Rule 7 (Supported Components): ✓ PASS
  - camel-rest: supported by Apache Camel
  - camel-jackson: supported by Apache Camel
  - camel-seda: supported by Apache Camel

Constitution Rule 8 (Infrastructure via Forage): ✓ PASS
  - No hand-wired infrastructure bean bypasses the Forage configuration ladder

Code Quality: PASS
```

If the quality reviewer classifies an issue as **Critical**:

```
Constitution Rule 6 (External Configuration): ✗ FAIL
  - Found hardcoded port 8080 in REST URI
  - Expected: {{rest.port}} property reference
  - Severity: Critical (Constitution violation)

Code Quality: Critical issue
Regenerating route...
```

The executor provides specific Critical findings to `camel-implement`, then re-runs quality review, for at most three rounds. Important and Suggestion findings are recorded in the report but do not block task completion.

<!--tab Generated Artifacts-->
## Complete Project Artifacts

After all tasks complete, the executor collects artifacts in the selected runtime's layout. In the table, `{module}/` is an optional relative prefix for the flow's target module; omit the entire prefix for a single-project root:

| Artifact | Camel Main | Spring Boot / Quarkus |
|---|---|---|
| Routes and XSLT DataMapper (when selected) | `{module}/<name>.camel.yaml` and `{module}/kaoto-datamapper-*.xsl` | `{module}/src/main/resources/camel/` |
| Application properties | `{module}/application.properties` | `{module}/src/main/resources/application.properties` |
| Generated schemas (when requested) | `{module}/schemas/` | `{module}/src/main/resources/schemas/` |
| Kaoto project metadata (XSLT DataMapper only) | `<project-root>/.kaoto` | `<project-root>/.kaoto` |
| Citrus tests | `{module}/src/test/resources/<flow>.camel.it.yaml` | `{module}/src/test/resources/<flow>.camel.it.yaml` |
| Test support | Under `{module}/src/test/resources/`: `test-data/`, `application-test.properties`, and `jbang.properties` | Under `{module}/src/test/resources/`: `test-data/` and `application-test.properties`; dependencies are in the POM |
| Synthetic pipeline test data (when required) | `docs/camel-kit/<pipeline-id>/test-data/<flow>/` | `docs/camel-kit/<pipeline-id>/test-data/<flow>/` |
| Build/runtime files | No POM; JBang dependencies live in `application.properties`, with `{module}/run.sh` | `{module}/pom.xml`, copied from the Spring Boot or Quarkus template and then filled with resolved dependencies |
| Docker Compose | `{module}/docker-compose.yaml` only when external services are required; includes the Camel JBang application and those services | `{module}/docker-compose.yaml` only when external services are required; manages those services while the application runs through Maven |
| Verification log | `<project-root>/.camel-kit/verify-log.md` | `<project-root>/.camel-kit/verify-log.md` |

**Execution Report:**
```
docs/camel-kit/<pipeline-id>/execution-report.md
```

Camel Main does not receive a `pom.xml`. Spring Boot and Quarkus use the bundled `pom-spring-boot.xml` and `pom-quarkus.xml` templates respectively; the executor replaces their declared placeholders and adds only the catalog-resolved dependencies required by the plan.
{{< /tabs >}}

## Detailed Artifact Examples

### Camel YAML Routes

Tasks produce `.camel.yaml` files following the Constitution and the catalog-verified endpoint schemas. Error handling
is declared either globally before the first route or at route scope, never as a processing step. Static `to` endpoints
contain no `${...}` expressions; a genuinely dynamic destination uses `toD`. These rules are checked before Camel's
route validator accepts a generated file.

### Application Properties

The path and runtime keys follow the layout above. This concise Spring Boot example lives at `{module}/src/main/resources/application.properties`; Camel Main uses module-root `application.properties` with `camel.server.*` and `camel.jbang.dependencies`, while Quarkus uses `quarkus.*` server keys:

```properties
server.port=${SERVER_PORT:8080}
camel.component.kafka.brokers=${KAFKA_BROKERS}
```

### Conditional Docker Compose

`docker-compose.yaml` is generated at the module root only when the design requires external services. Camel Main's file runs the Camel JBang application plus those services; Spring Boot and Quarkus use Compose only for the services and run the application with Maven. No external services means no Compose file.

### Citrus Integration Tests

Behavioral tests from acceptance criteria are generated as Citrus YAML under `{module}/src/test/resources/` for every runtime, for example `order-reception.camel.it.yaml` and `order-validation.camel.it.yaml`.

Each `.camel.it.yaml` file launches the Camel integration with the Citrus
`camel` JBang action, sends test input, and asserts the expected outcome. The exact Citrus actions and endpoints are
verified against the configured Citrus version before generation. Where external infrastructure is required, the test
declares the corresponding Testcontainers; external APIs are mocked instead.

### Execution Report

`docs/camel-kit/<pipeline-id>/execution-report.md` stores the exact completion contract, including non-passing and
skipped verification outcomes:

```text
===============================================================
IMPLEMENTATION COMPLETE
===============================================================

Pipeline: <PIPELINE_ID>
Plan: docs/camel-kit/<PIPELINE_ID>/implementation-plan.md
Design Spec: docs/camel-kit/<PIPELINE_ID>/design-spec.md

Tasks Completed: [N/N]

Generated Files:
  [list all generated files with paths]

Review Results:
  Spec Compliance: [N/N] tasks passed
  Code Quality: [N/N] tasks passed ([M] non-critical issues noted)

Cross-Cutting Review: PASS/FAIL

Verification: PASS/PARTIAL/FAIL/NOT_RUN
  [full verification report]

===============================================================
```

## Adversarial Pre-Filter and Two-Stage Review in Action

The examples below begin after the adversarial pre-filter passes. If the critics find a verified issue, the implementer corrects it and the pre-filter reruns before Stage 1.

### Example: Task Fails Spec Compliance

```
Implementing Task 2: Order Validation Flow

Generated route: order-validation.camel.yaml

Stage 1: Spec Compliance Review
  Checking acceptance criteria...
  
  ✓ Consumes from SEDA queue "orders.processing"
  ✓ Validates: orderId not null
  ✓ Validates: totalAmount > 0
  ✗ Validates: customerId not null
    → Not found in route
  
  Spec Compliance: FAIL
  
Regenerating route with feedback:
  "Add validation for customerId not null"

Generated route: order-validation.camel.yaml (attempt 2)

Stage 1: Spec Compliance Review
  Checking acceptance criteria...
  
  ✓ All criteria met
  
  Spec Compliance: PASS
  
Stage 2: Code Quality Review
  Checking Constitution...
  
  ✓ Rule 1: Route structure
  ✓ Rule 2: Single responsibility
  ✓ Rule 3: Separation of concerns
  ✓ Rule 4: Naming conventions
  ✓ Rule 5: Observability
  ✓ Rule 6: External configuration
  ✓ Rule 7: Supported components
  ✓ Rule 8: Infrastructure via Forage
  
  Code Quality: PASS

Task 2 complete.
```

### Example: Task Records a Non-Blocking Quality Finding

```
Stage 1: Spec Compliance Review
  ✓ PASS

Stage 2: Code Quality Review
  Checking Constitution...
  
  ✓ Rule 1: Route structure
  ✓ Rule 2: Single responsibility
  ✓ Rule 3: Separation of concerns
  ✓ Rule 4: Naming conventions
  ⚠ Rule 5: Observability
    → Correlation ID is not propagated across the asynchronous boundary
    → Severity: Important
  ✓ Rule 6: External configuration
  ✓ Rule 7: Supported components
  ✓ Rule 8: Infrastructure via Forage
  
  Code Quality: PASS with 1 non-blocking finding
  Recorded: Propagate a correlation ID across the asynchronous boundary

Task 2 complete.
```

## Capability-Aware Wave Execution

Tasks in the same wave execute concurrently only when the selected target supports independent agent conversations. For example:

**Wave 5 (3 parallel tasks):**
```
Starting Wave 5 (parallel execution)...

[Task 5 thread] Implementing Kafka Warehouse Publisher...
[Task 6 thread] Implementing Kafka Pending Publisher...
[Task 7 thread] Implementing Kafka Invalid Publisher...

[Task 5 thread] Spec compliance: PASS
[Task 7 thread] Spec compliance: PASS
[Task 6 thread] Spec compliance: PASS

[Task 5 thread] Code quality: PASS
[Task 6 thread] Code quality: PASS
[Task 7 thread] Code quality: PASS

Wave 5 complete (elapsed: 2m 15s)
```

Targets without concurrent conversations execute the same wave sequentially in plan order. Wave analysis still preserves dependency order and prevents later waves from starting early.

## Final Cross-Cutting Review

After all blocking task-level findings are cleared, the executor checks cross-route consistency: endpoint contracts, shared properties, error-channel wiring, naming, and observability across the complete project. It records those findings in the completion summary before running internal runtime verification.

## Rerun After Failure

If execution stops mid-plan, correct the underlying problem through the owning implementation, test, or re-plan path,
then rerun the pipeline:

```
/camel-execute <pipeline-id>
```

`/camel-execute` does not expose a task-level resume option or skip previously completed tasks; the rerun executes the
ready plan from the beginning.

## DataMapper Integration

If the Design Specification includes DataMapper transformations, `camel-implement` loads the applicable DataMapper guides.

Engine selection follows the mapping recorded in the design:

- Inline Groovy when both schemas are absent or the mapping has fewer than 20 leaf fields
- XSLT when the mapping has at least 20 leaf fields and at least one schema is available

The following example is the XSLT case: it assumes a schema-backed mapping with at least 20 leaf fields.

**Task Example:**
```markdown
## Task 2: Order Transformation (DataMapper)

**Description:**
Transform incoming order JSON to canonical format using XSLT DataMapper.

**Acceptance Criteria:**
- Input: Mule-style order JSON
- Output: Camel canonical order JSON
- Transformation: XSLT via DataMapper
- Field mappings: 24 leaf mappings, including orderId → id and customer.email → customerEmail
- Schemas: source and target schema paths from the approved design
```

The `camel-implement` skill generates:

1. **XSLT stylesheet:** `{module}/kaoto-datamapper-a1b2c3d4.xsl` for Camel Main, or `{module}/src/main/resources/camel/kaoto-datamapper-a1b2c3d4.xsl` for Spring Boot and Quarkus
2. **Route with XSLT processor:**
```yaml
- route:
    id: order-transformation
    from:
      uri: seda:orders-raw
      steps:
        - step:
            id: kaoto-datamapper-a1b2c3d4
            steps:
              - to:
                  id: kaoto-datamapper-xslt-a1b2
                  uri: xslt-saxon:kaoto-datamapper-a1b2c3d4.xsl
                  parameters:
                    useJsonBody: true
        - to: seda:orders-canonical
```

## Summary

`/camel-execute` transforms Implementation Plans into generated code and evidence through:

1. **Wave Analysis** - Dependency waves with capability-aware concurrency
2. **Catalog Research** - Batch-verifies every wave's Camel artifacts before generation
3. **Internal Skills** - camel-implement, camel-test, camel-verify
4. **Per-Task Loop** - Implement → Adversarial Review → Spec Compliance → Code Quality
5. **Final Review** - Checks cross-route contracts and shared configuration
6. **Artifact Generation** - YAML routes, tests, and configuration, plus runtime-specific build files and conditional Docker Compose
7. **Runtime Verification** - Runs internal `camel-verify` in the target-appropriate context
8. **Pipeline Transition** - Continues to `/camel-validate` only in chained mode

The result is a runtime-specific project with runtime-verification evidence and an execution report. Phase 4 supplies the final static validation report.

Next: [Runtime Verification](../verify/) explains the internal feedback loop. A chained run then continues to `/camel-validate`; standalone execute stops after its summary.
