---
title: "Task Planning"
weight: 3
description: "/camel-plan — Phase 2: Task decomposition and planning"
---

## Overview

`/camel-plan` is the Phase 2 orchestrator that transforms the approved Design Specification into an executable Implementation Plan. Through task decomposition, dependency analysis, and wave planning, the AI creates a structured recipe for code generation.

The output is a task-by-task breakdown with acceptance criteria, component lists, dependency waves, and optional concurrency candidates.

## When to Use

Invoke `/camel-plan` when you:

- Have an approved Design Specification from `/camel-brainstorm` or `/camel-migrate`
- Want to see the implementation broken into discrete tasks before code generation
- Need to understand task dependencies and execution order

**Auto-invocation:** In a same-conversation chained pipeline, approving the Design Specification in `/camel-brainstorm` or `/camel-migrate` automatically invokes `/camel-plan`. You can also invoke it independently.

## Input: Design Specification

`/camel-plan` reads the Design Specification from `docs/camel-kit/<pipeline-id>/design-spec.md` (created by `/camel-brainstorm` or `/camel-migrate`).

For a greenfield design, the planner analyzes all six sections:

1. **Executive Summary** → Understand the goal and constraints
2. **Systems Landscape** → Determine external systems and component requirements
3. **Flow Designs** → Identify implementation tasks and contracts
4. **Cross-Cutting Concerns** → Plan errors, security, resilience, observability, and configuration
5. **Constitution Compliance** → Carry the approved architectural constraints into each task
6. **Project Structure** → Select runtime-specific files and module layout

Migration designs add a seventh migration-context section, which the planner also incorporates.

## The Planning Process

The AI executes four steps to transform the design into an executable plan.

{{< carousel id="plan-details" >}}
<!--step Step 1: Flow-to-Task Mapping-->

### Step 1: Flow-to-Task Mapping

Each integration flow becomes one or more implementation tasks.

**Example:**

Design Specification flows:
```markdown
- Flow 1: Order Reception - REST endpoint
- Flow 2: Order Validation - Business rules
- Flow 3: Customer Credit Lookup - Database query
- Flow 4: Routing Decision - Choice router
- Flow 5: Warehouse Publisher - Kafka producer
```

Selected route-task excerpt (illustrative IDs):
```markdown
Task 1: REST Endpoint for Order Reception
Task 2: Order Validation Flow
Task 3: Customer Credit Lookup Flow (including retry and error behavior)
Task 4: Conditional Routing (Valid/Pending/Invalid)
Task 5: Kafka Publisher for Warehouse Orders
Task 6: Kafka Publisher for Pending Orders
Task 7: Kafka Publisher for Invalid Orders
```

Notice that Flow 4 (Routing Decision) became multiple route tasks (5, 6, 7)
because each destination is a separate implementation concern (Constitution Rule
3: Separation of Concerns). A complete plan also contains separate scaffold,
configuration, runtime-dependency, test, and conditional infrastructure tasks;
those are omitted from this route-focused excerpt.


<!--step Step 2: Acceptance Criteria Definition-->

### Step 2: Acceptance Criteria Definition

For each task, the AI defines acceptance criteria that specify exactly what "done" means.

**Example: Task 1 (REST Endpoint)**

```markdown
**Acceptance Criteria:**
- REST endpoint listens on port {{rest.port}} (externalized config)
- Accepts POST requests at /api/orders
- Expects JSON payload with orderId, customerId, items, totalAmount
- Returns HTTP 202 Accepted immediately (fire-and-forget)
- Passes order to internal SEDA queue for async processing
- No business logic in this route (separation of concerns)
```

**Example: Task 3 (Customer Credit Lookup)**

```markdown
**Acceptance Criteria:**
- Receives order from internal queue
- Queries PostgreSQL using camel-sql component
- SQL: SELECT credit_status, warehouse_location FROM customers WHERE id = :customerId
- Database URL, username, password from application.properties
- Sets custom headers: credit-status, warehouse-location
- Handles SQLException with 3 retries (exponential backoff 2s, 4s, 8s)
- If all retries exhausted, routes to error handler
```

Acceptance criteria are the contract between the plan and implementation. The spec compliance review (Iron Law #4) validates generated code against these criteria.


<!--step Step 3: Component and Dependency Listing-->

### Step 3: Component and Dependency Listing

For each task that uses Camel artifacts, the AI lists the required Camel
components, EIPs, data formats, and languages.

**Example: Task 5 (Kafka Publisher)**

```markdown
**Components:**
- camel-kafka (producer)
- camel-jackson (JSON serialization)

**Dependencies:**
- Kafka client libraries (included with camel-kafka)
```

This ensures the implementation phase knows exactly which components to use, preventing "I'll just use whichever HTTP component seems right" ambiguity.


<!--step Step 4: Wave Analysis (Dependency Graph)-->

### Step 4: Wave Analysis (Dependency Graph)

The AI builds a dependency graph to assign dependency waves and identify concurrency candidates.

**Dependency Rules:**

1. **No dependency** → Can run in Wave 1 (first)
2. **Depends on another task** → Runs in a later wave after dependency completes
3. **Multiple independent tasks** → Can run in the same wave; targets that support independent conversations may execute them in parallel

**Example Dependency Graph (selected route tasks):**

```
Task 1 (REST Endpoint) → no dependencies
  ↓
Task 2 (Validation) → depends on Task 1 (needs input from REST)
Task 3 (Credit Lookup) → depends on Task 2 (needs validated order)
  ↓
Task 4 (Routing) → depends on Task 3 (needs credit status)
  ↓
Task 5 (Kafka Warehouse) → depends on Task 4 (one routing branch)
Task 6 (Kafka Pending) → depends on Task 4 (another routing branch)
Task 7 (Kafka Invalid) → depends on Task 2 (validation failures)
```

**Wave Assignment (selected route tasks):**

```
Wave 1:
  - Task 1: REST Endpoint

Wave 2 (sequential, depends on Wave 1):
  - Task 2: Validation

Wave 3 (parallel-capable, depends on Wave 2):
  - Task 3: Credit Lookup
  - Task 7: Kafka Invalid Publisher

Wave 4 (sequential, depends on Wave 3):
  - Task 4: Routing Decision

Wave 5 (parallel-capable, depends on Wave 4):
  - Task 5: Kafka Warehouse Publisher
  - Task 6: Kafka Pending Publisher
```

This excerpt omits the plan's supporting artifact, configuration, dependency,
test, and conditional infrastructure tasks. Tasks in the same wave are concurrency
candidates. Targets that support independent conversations can implement them in
parallel; other targets execute them sequentially. Tasks in later waves always wait
for their dependencies.


<!--step Implementation Plan Format-->

## Implementation Plan Format

The planner writes a Markdown recipe with provenance frontmatter, the project goal and architecture, a machine-readable task map, and the human-readable task instructions.

### Structured Task Metadata

Before the first task, a fenced block whose exact info string is `yaml plan-metadata` contains one entry for every numbered task. IDs and titles match the Markdown headings; file actions, logical resources, and explicit dependencies give `camel-kit plan analyze` enough information to build dependency waves. For example, a Spring Boot plan might contain:

```yaml plan-metadata
tasks:
  - id: 1
    title: Runtime configuration and dependencies
    files:
      creates:
        - src/main/resources/application.properties
      modifies:
        - pom.xml
    provides:
      properties:
        - orders.api.path
    dependsOn: []
  - id: 2
    title: Order intake route
    files:
      creates:
        - src/main/resources/camel/order-intake.camel.yaml
    provides:
      routes:
        - order-intake
      endpoints:
        - direct:validate-order
    consumes:
      properties:
        - orders.api.path
    dependsOn: [1]
  - id: 3
    title: Order intake Citrus test
    files:
      tests:
        - src/test/resources/order-intake.camel.it.yaml
      reads:
        - src/main/resources/camel/order-intake.camel.yaml
        - src/main/resources/application.properties
    consumes:
      routes:
        - order-intake
      properties:
        - orders.api.path
    dependsOn: [1, 2]
```

Metadata may group paths under `creates`, `modifies`, `reads`, `deletes`, `tests`, or `references`. Logical `provides` and `consumes` keys cover routes, endpoints, properties, schemas, test data, beans, external services, and route contracts.

### Required Task Fields

Every `### Task N` section contains the complete execution recipe:

```markdown
### Task N: [Component or flow name]

**Agent:** [integration-architect, implementation-engineer, migration-specialist, or test-engineer]

**Files:**
- Create or modify: [exact runtime-specific paths]

**Guides to Load:**
- [exact skill guide paths]

**MCP Tools:**
- [exact calls with runtime and full version-selecting platform BOM parameters]

**Design Spec Section:** [exact section and flow]

- [ ] **Step 1:** [specific implementation action]
- [ ] **Step N:** Verify with [exact command] and expect [observable result]

**Review:**
- [ ] Spec compliance: [artifact checks against the approved design]
- [ ] Code quality: [applicable Constitution, security, and anti-pattern checks]
```

The plan must contain no `TBD`, deferred work, vague steps, implicit file paths, or verification without an exact command and expected result. Each design flow must map to at least one task.

<!--step The Plan is a Recipe, Not the Meal-->

## The Plan is a Recipe, Not the Meal

A critical principle: **The Implementation Plan contains detailed instructions for generating code, not the generated artifacts themselves.**

The plan specifies:
- **What** to build (task descriptions and exact runtime-specific paths)
- **How** to build it (ordered steps, exact guide paths, endpoint URI and configuration decisions)
- **Which tools** to use (exact MCP calls with runtime and full platform BOM parameters)
- **How to validate** it (exact commands and expected results)
- **When** to build it (dependencies and wave analysis)

The plan does **not** embed:
- Generated YAML routes or property files
- Generated Java or bean implementations
- Generated POM dependencies
- Generated test files

This keeps the plan execution-ready without duplicating artifacts that `/camel-execute` generates from the current guides and catalog data.

The plan is a recipe. `/camel-execute` is the cooking.


<!--step Wave-Based Execution Benefits-->

## Wave-Based Execution

Wave analysis identifies concurrency candidates for `/camel-execute`. Targets that support independent conversations may execute same-wave tasks in parallel; other targets execute them sequentially while preserving the dependency order.

### Why Waves Matter

Without wave analysis, tasks execute sequentially even if they're independent:

```
Task 1 (5 min) → Task 2 (5 min) → Task 3 (5 min) = 15 minutes total
```

On a concurrency-capable target, independent tasks in one wave can execute in parallel:

```
Wave 1: Task 1, Task 2, Task 3 (parallel-capable) = about 5 minutes total
```

Actual execution time depends on target capabilities, task duration, and available concurrency. On targets without independent conversations, the same wave still records dependency ordering but its tasks run sequentially.

### Wave Assignment Logic

The AI uses topological sorting to assign waves:

1. **Identify tasks with no dependencies** → Wave 1
2. **Remove Wave 1 tasks from the graph**
3. **Identify remaining tasks with no dependencies** → Wave 2
4. **Repeat** until all tasks assigned

If a circular dependency exists, the AI reports an error:

```
Error: Circular dependency detected between Task 3 and Task 5.
Please review the Design Specification and clarify the flow order.
```

### Dependency Types

Tasks can depend on each other in three ways:

**1. Data Dependency**

Task B needs output from Task A:
```
Task A: Query database for customer
Task B: Use customer data to enrich order
→ Task B depends on Task A
```

**2. Routing Dependency**

Task B is invoked by Task A:
```
Task A: REST endpoint sends to SEDA queue
Task B: Consumes from SEDA queue
→ Task B depends on Task A (queue must exist)
```

**3. No Dependency**

Tasks are completely independent:
```
Task A: REST endpoint for orders
Task B: Scheduled inventory synchronization
→ No dependency (separate flows with no shared artifact)
```


<!--step Two-Stage Review Specification-->

## Two-Stage Review Specification

Each task includes a "Review" section that specifies the two-stage review process for Iron Law #4.

**Stage 1: Spec Compliance Review**

Validates the implementation against acceptance criteria:
- Are all criteria met?
- Does the route do what the task says?
- Are the correct components used?

**Stage 2: Code Quality Review**

Validates the implementation against the Constitution:
- For route tasks, does every route have a source and sink (with the constitution's internal sub-route exemption and pass-through warning)?
- Single responsibility?
- Separation of concerns?
- Proper naming conventions?
- Observability included?
- External configuration used?
- Only supported components?

If Stage 1 fails, return the findings to the task's declared implementer. Don't proceed to Stage 2 until the task output meets the spec.


<!--step Auto-Transition to Execution-->

## Chained Transition to Execution

When `/camel-plan` runs inside the same conversation as a chained pipeline, generating the Implementation Plan automatically transitions to `/camel-execute`. There is no separate plan approval gate in that flow — the design approval from `/camel-brainstorm` is the single approval gate.

```
Implementation Plan generated.

The plan contains 8 tasks organized into 5 execution waves.
4 tasks are parallel-capable (Waves 1 and 5).

Auto-transitioning to /camel-execute...
```

The AI saves the Implementation Plan to `docs/camel-kit/<pipeline-id>/implementation-plan.md`. In a same-conversation chained pipeline it proceeds to `/camel-execute`. When invoked independently, it stops and prints the next command, whether the pipeline ID was supplied explicitly or discovered from the current project state.

### Refining the Plan

Planning controls differ by target:

- **Claude Code:** the chained trait stays out of native plan mode and does not call `ExitPlanMode`, avoiding a second approval gate
- **Gemini CLI:** use Shift+Tab to switch approval mode
- **Qwen Code:** use `/approval-mode` to adjust

In the default chained flow, however, the plan proceeds directly to execution without pausing.


<!--step Plan Reuse-->

## Plan Reuse

The Implementation Plan is reusable while its approved design remains unchanged. For a transient environment failure,
resolve the external problem and rerun `/camel-execute <pipeline-id>` without regenerating the plan; execution starts
from the beginning because there is no task-level resume option.

**Example:**

```
/camel-execute 001-order-processing
(Execution completes with the Docker service probe and Testcontainers-dependent tests recorded as skipped)

(You restore the container runtime; the approved design is unchanged)

/camel-execute 001-order-processing
(Execution reruns the ready plan from the beginning and performs the previously skipped checks)
```

If the Design Specification changes, amend it through `/camel-brainstorm <pipeline-id>` and regenerate the now-stale plan before
executing again.


<!--step Customizing the Planner-->

## Customizing the Planner

The planning logic is defined in the selected target's generated `camel-plan/SKILL.md`; for Claude Code, that path is `.claude/skills/camel-plan/SKILL.md`. Bob 1 uses the same skill name for its legacy monolithic gate. You can customize:

- **Task granularity** - Break flows into finer or coarser tasks
- **Wave strategy** - Prefer sequential execution or mark same-wave tasks as concurrency candidates
- **Review checks** - Add project-specific checks within the required spec-compliance and code-quality stages

**Example Customization:** Add explicit security checks to the code-quality stage:

For this Claude Code example, edit `.claude/skills/camel-plan/SKILL.md` and update the task template:

```markdown
**Review:**
- Spec compliance: Validate against acceptance criteria
- Code quality: Validate against Constitution, including no hardcoded secrets and proper input validation
```

Execution still runs the two required stages in order: spec compliance, then code quality. Security also remains part of the adversarial review lanes.


<!--step Common Planning Patterns-->

## Common Planning Patterns

### Pattern 1: Linear Pipeline

```
Task 1 → Task 2 → Task 3 → Task 4

Wave 1: Task 1
Wave 2: Task 2
Wave 3: Task 3
Wave 4: Task 4
```

All tasks are sequential dependencies, so there are no concurrency candidates.

### Pattern 2: Fan-Out

```
Task 1 → Task 2, Task 3, Task 4 (parallel-capable)

Wave 1: Task 1
Wave 2: Task 2, Task 3, Task 4
```

One source task fans out to multiple independent destination tasks. A concurrency-capable target may execute the second wave in parallel.

### Pattern 3: Fan-In

```
Task 1, Task 2, Task 3 (parallel-capable) → Task 4

Wave 1: Task 1, Task 2, Task 3
Wave 2: Task 4
```

Multiple independent source tasks converge to one aggregation task. A concurrency-capable target may execute the first wave in parallel.

### Pattern 4: Diamond

```
     Task 1
    ↙      ↘
Task 2      Task 3
    ↘      ↙
     Task 4

Wave 1: Task 1
Wave 2: Task 2, Task 3 (parallel-capable)
Wave 3: Task 4
```

One task splits into independent tasks that may run concurrently on a capable target, then joins.
{{< /carousel >}}

## Summary

`/camel-plan` transforms Design Specifications into Implementation Plans through:

1. **Flow-to-Task Mapping** - Each flow becomes one or more discrete tasks
2. **Acceptance Criteria** - Clear definition of "done" for each task
3. **Component Listing** - Required Camel components per task
4. **Wave Analysis** - Dependency graph with optional parallel candidates
5. **Two-Stage Review** - Spec compliance + code quality per task
6. **Chained Handoff** - Automatic progression to code generation only within a same-conversation chained pipeline

The Implementation Plan is the recipe for `/camel-execute`: it specifies what to build and gives the detailed how-to instructions, without embedding the generated artifacts.

Next: [/camel-execute](../execute/) to learn how code generation works.
