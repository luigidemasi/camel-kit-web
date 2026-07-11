---
title: "Task Planning"
weight: 2
description: "/camel-plan — Phase 2: Task decomposition and planning"
---

## Overview

`/camel-plan` is the Phase 2 orchestrator that transforms the approved Design Specification into an executable Implementation Plan. Through task decomposition, dependency analysis, and wave planning, the AI creates a structured recipe for code generation.

The output is a task-by-task breakdown with acceptance criteria, component lists, and parallel execution waves.

## When to Use

Invoke `/camel-plan` when you:

- Have an approved Design Specification from `/camel-brainstorm`
- Want to see the implementation broken into discrete tasks before code generation
- Need to understand task dependencies and execution order

**Auto-invocation:** After you approve the Design Specification in `/camel-brainstorm`, the AI automatically invokes `/camel-plan`. You rarely need to invoke it manually.

## Input: Design Specification

`/camel-plan` reads the Design Specification from `docs/camel-kit/<pipeline-id>/design-spec.md` (created by `/camel-brainstorm`).

The planner analyzes all seven sections:

1. **Business Purpose** → Understand the overall goal
2. **Integration Flows** → Identify distinct implementation tasks
3. **Systems and Endpoints** → Determine component requirements
4. **Data Formats** → Plan transformation tasks
5. **Error Handling Strategy** → Create error handling tasks
6. **Technical Requirements** → Set constraints (components, performance)
7. **Observability and Configuration** → Include metrics and config tasks

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

Implementation Plan tasks:
```markdown
Task 1: REST Endpoint for Order Reception
Task 2: Order Validation Flow
Task 3: Customer Credit Lookup Flow
Task 4: Conditional Routing (Valid/Pending/Invalid)
Task 5: Kafka Publisher for Warehouse Orders
Task 6: Kafka Publisher for Pending Orders
Task 7: Kafka Publisher for Invalid Orders
Task 8: Error Handler for Database Failures
```

Notice that Flow 4 (Routing Decision) became multiple tasks (5, 6, 7) because each destination is a separate implementation concern (Constitution Rule 3: Separation of Concerns).


<!--step Step 2: Acceptance Criteria Definition-->

### Step 2: Acceptance Criteria Definition

For each task, the AI defines acceptance criteria that specify exactly what "done" means.

**Example: Task 1 (REST Endpoint)**

```markdown
**Acceptance Criteria:**
- REST endpoint listens on port ${rest.port} (externalized config)
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
- Sets headers: creditStatus, warehouseLocation
- Handles SQLException with 3 retries (exponential backoff 2s, 4s, 8s)
- If all retries exhausted, routes to error handler
```

Acceptance criteria are the contract between the plan and implementation. The spec compliance review (Iron Law #4) validates generated code against these criteria.


<!--step Step 3: Component and Dependency Listing-->

### Step 3: Component and Dependency Listing

For each task, the AI lists required Camel components.

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

The AI builds a dependency graph to determine which tasks can run in parallel.

**Dependency Rules:**

1. **No dependency** → Can run in Wave 1 (first)
2. **Depends on another task** → Runs in a later wave after dependency completes
3. **Multiple independent tasks** → Can run in the same wave (parallel)

**Example Dependency Graph:**

```
Task 1 (REST Endpoint) → no dependencies
  ↓
Task 2 (Validation) → depends on Task 1 (needs input from REST)
Task 3 (Credit Lookup) → depends on Task 2 (needs validated order)
Task 8 (Error Handler) → no dependencies (standalone)
  ↓
Task 4 (Routing) → depends on Task 3 (needs credit status)
  ↓
Task 5 (Kafka Warehouse) → depends on Task 4 (one routing branch)
Task 6 (Kafka Pending) → depends on Task 4 (another routing branch)
Task 7 (Kafka Invalid) → depends on Task 2 (validation failures)
```

**Wave Assignment:**

```
Wave 1 (parallel):
  - Task 1: REST Endpoint
  - Task 8: Error Handler

Wave 2 (sequential, depends on Wave 1):
  - Task 2: Validation

Wave 3 (sequential, depends on Wave 2):
  - Task 3: Credit Lookup

Wave 4 (sequential, depends on Wave 3):
  - Task 4: Routing Decision

Wave 5 (parallel, depends on Wave 4):
  - Task 5: Kafka Warehouse Publisher
  - Task 6: Kafka Pending Publisher
  - Task 7: Kafka Invalid Publisher
```

Tasks in the same wave can be implemented in parallel. Tasks in later waves wait for their dependencies.


<!--step Implementation Plan Format-->

## Implementation Plan Format

The planner produces a structured markdown document with task details and wave analysis.

### Task Structure

Each task follows this template:

```markdown
## Task N: [Task Name]

**Description:**
[What this task does in 1-2 sentences]

**Acceptance Criteria:**
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

**Components:**
- camel-component-1
- camel-component-2

**Review:**
- Spec compliance: Validate against acceptance criteria
- Code quality: Validate against Constitution

**Dependencies:**
- Task X (if any)
```

### Full Example

```markdown
# Implementation Plan: Order Processing Integration

## Task 1: REST Endpoint for Order Reception

**Description:**
Expose a REST endpoint that accepts order POST requests and 
returns HTTP 202 Accepted immediately. The endpoint passes 
orders to an internal SEDA queue for asynchronous processing.

**Acceptance Criteria:**
- REST endpoint listens on port ${rest.port} (default 8080)
- Accepts POST at /api/orders with JSON body
- Returns HTTP 202 Accepted with no body
- Sends order to SEDA queue "orders.processing"
- No validation or business logic in this route
- Metrics: orders.received.total counter

**Components:**
- camel-rest (embedded Jetty)
- camel-jackson (JSON unmarshalling)
- camel-seda (async queue)

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 2 (single responsibility), 
  3 (separation of concerns), 5 (metrics), 6 (external config)

**Dependencies:**
- None

---

## Task 2: Order Validation Flow

**Description:**
Consumes orders from the SEDA queue, validates schema and 
business rules, and routes valid orders forward or invalid 
orders to the error queue.

**Acceptance Criteria:**
- Consumes from SEDA queue "orders.processing"
- Validates: orderId not null, totalAmount > 0, customerId not null
- Valid orders → send to SEDA "orders.enrichment"
- Invalid orders → send to Kafka topic "orders.invalid" with error message
- Metrics: orders.valid.total, orders.invalid.total counters
- Log validation failures at WARN level

**Components:**
- camel-seda (consumer)
- camel-bean (validation logic)
- camel-choice (conditional routing)
- camel-kafka (invalid orders producer)

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 1 (route structure), 2 (single 
  responsibility), 5 (observability), 6 (external config for Kafka)

**Dependencies:**
- Task 1 (REST Endpoint creates SEDA queue)

---

## Task 3: Customer Credit Lookup Flow

**Description:**
Queries PostgreSQL database to retrieve customer credit status 
and warehouse location, enriches the order, and handles database 
failures with retry logic.

**Acceptance Criteria:**
- Consumes from SEDA "orders.enrichment"
- SQL query: SELECT credit_status, warehouse_location FROM customers WHERE id = :customerId
- Database config from application.properties (url, username, password)
- Sets exchange headers: creditStatus, warehouseLocation
- On SQLException: retry 3x with exponential backoff (2s, 4s, 8s)
- After retry exhaustion: send to SEDA "orders.error"
- Metrics: database.lookup.time timer, errors.database.total counter

**Components:**
- camel-seda (consumer)
- camel-sql (database query)
- camel-bean (retry logic)

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 2, 5, 6

**Dependencies:**
- Task 2 (Validation sends to SEDA enrichment queue)

---

## Task 4: Conditional Routing Flow

**Description:**
Routes enriched orders based on credit status: ACTIVE → warehouse, 
BLOCKED → pending, or validation failures → invalid.

**Acceptance Criteria:**
- Consumes from credit lookup output
- If creditStatus = "ACTIVE" → send to SEDA "orders.warehouse"
- If creditStatus = "BLOCKED" → send to SEDA "orders.pending"
- Uses Camel Choice DSL for conditional routing
- Logs routing decision at INFO level

**Components:**
- camel-choice (conditional router)
- camel-seda (multiple destinations)

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rule 2 (single responsibility)

**Dependencies:**
- Task 3 (Credit lookup sets creditStatus header)

---

## Task 5: Kafka Publisher for Warehouse Orders

**Description:**
Publishes validated, active-credit orders to Kafka topic 
"warehouse.orders" for consumption by the warehouse management system.

**Acceptance Criteria:**
- Consumes from SEDA "orders.warehouse"
- Publishes to Kafka topic "warehouse.orders" on broker ${kafka.brokers}
- Message key: order.orderId
- Message value: JSON order with credit and warehouse fields
- On publish failure: retry indefinitely with 1s delay
- Metrics: kafka.publish.time timer

**Components:**
- camel-kafka (producer)
- camel-jackson (JSON marshalling)

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 5, 6

**Dependencies:**
- Task 4 (Routing sends to SEDA warehouse queue)

---

## Task 6: Kafka Publisher for Pending Orders

**Description:**
Publishes blocked-credit orders to Kafka topic "orders.pending" 
for manual review by the finance team.

**Acceptance Criteria:**
- Consumes from SEDA "orders.pending"
- Publishes to Kafka topic "orders.pending"
- Same retry and metrics as Task 5

**Components:**
- camel-kafka, camel-jackson

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 5, 6

**Dependencies:**
- Task 4 (Routing sends to SEDA pending queue)

---

## Task 7: Kafka Publisher for Invalid Orders

**Description:**
Publishes validation-failed orders to Kafka topic "orders.invalid" 
with error messages for manual review.

**Acceptance Criteria:**
- Consumes from validation failure route (Task 2 output)
- Publishes to Kafka topic "orders.invalid"
- Includes validation error message in JSON payload
- Same retry and metrics as Task 5

**Components:**
- camel-kafka, camel-jackson

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 5, 6

**Dependencies:**
- Task 2 (Validation failures route here)

---

## Task 8: Error Handler for Database Failures

**Description:**
Handles database lookup failures after retry exhaustion by 
sending email alerts to operations team.

**Acceptance Criteria:**
- Consumes from SEDA "orders.error"
- Sends email to ${ops.email} via SMTP server ${smtp.host}
- Email subject: "Order Processing Database Error"
- Email body: orderId, error message, timestamp
- Rate limiting: Alert if > 10 errors in 5 minutes
- Logs error at ERROR level

**Components:**
- camel-mail (SMTP sender)
- camel-bean (rate limiting logic)

**Review:**
- Spec compliance: All acceptance criteria met
- Code quality: Constitution Rules 5, 6

**Dependencies:**
- None (standalone error handler)

---

## Wave Analysis

**Wave 1 (Parallel Execution):**
- Task 1: REST Endpoint
- Task 8: Error Handler

**Wave 2 (Sequential, depends on Wave 1):**
- Task 2: Validation

**Wave 3 (Sequential, depends on Wave 2):**
- Task 3: Credit Lookup

**Wave 4 (Sequential, depends on Wave 3):**
- Task 4: Routing Decision

**Wave 5 (Parallel Execution, depends on Wave 4):**
- Task 5: Kafka Warehouse Publisher
- Task 6: Kafka Pending Publisher
- Task 7: Kafka Invalid Publisher

**Total Waves:** 5
**Total Tasks:** 8
**Parallelizable Tasks:** 4 (Tasks 1+8 in Wave 1, Tasks 5+6+7 in Wave 5)
```


<!--step The Plan is a Recipe, Not the Meal-->

## The Plan is a Recipe, Not the Meal

A critical principle: **The Implementation Plan contains no code.**

The plan specifies:
- **What** to build (task descriptions)
- **How to validate** (acceptance criteria)
- **Which tools** to use (components)
- **When** to build it (wave analysis)

The plan does **not** specify:
- YAML route syntax
- Exact URI configurations
- Bean method implementations
- Test case code

This separation prevents:
- Plan bloat (thousands of lines of speculative code)
- Premature decisions (exact URI syntax before knowing full context)
- Review fatigue (reviewing code twice: in plan and in implementation)

The plan is a recipe. `/camel-execute` is the cooking.


<!--step Wave-Based Execution Benefits-->

## Wave-Based Execution

Wave analysis enables parallel task execution during `/camel-execute`.

### Why Waves Matter

Without wave analysis, tasks execute sequentially even if they're independent:

```
Task 1 (5 min) → Task 2 (5 min) → Task 3 (5 min) = 15 minutes total
```

With wave analysis, independent tasks execute in parallel:

```
Wave 1: Task 1, Task 2, Task 3 (all parallel) = 5 minutes total
```

For an 8-task plan with 2 waves, you save 60% of execution time.

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
Task B: Error handler for notifications
→ No dependency (different concerns)
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
- Does it follow route structure (from → process → to)?
- Single responsibility?
- Separation of concerns?
- Proper naming conventions?
- Observability included?
- External configuration used?
- Only supported components?

If Stage 1 fails, regenerate the route. Don't proceed to Stage 2 until the route meets the spec.


<!--step Auto-Transition to Execution-->

## Auto-Transition to Execution

After generating the Implementation Plan, the pipeline automatically transitions to `/camel-execute`. There is no separate plan approval gate — the design approval (from `/camel-brainstorm`) is the single approval gate in the pipeline.

```
Implementation Plan generated.

The plan contains 8 tasks organized into 5 execution waves.
4 tasks can run in parallel (Waves 1 and 5).

Auto-transitioning to /camel-execute...
```

The AI saves the Implementation Plan to `docs/camel-kit/<pipeline-id>/implementation-plan.md`. In a chained pipeline it proceeds to `/camel-execute`; when invoked with a pipeline ID in standalone mode, it stops and prints the next command.

### Refining the Plan

If you want to review or refine the plan before execution begins, agents that support approval mode selection allow you to do so:

- **Claude Code:** presents auto-accept, manual, or refine options via ExitPlanMode
- **Gemini CLI:** use Shift+Tab to switch approval mode
- **Qwen Code:** use `/approval-mode` to adjust

In the default flow, however, the plan proceeds directly to execution without pausing.


<!--step Plan Reuse and Resume-->

## Plan Reuse

The Implementation Plan is reusable. If code generation fails during `/camel-execute`, you can fix the issue and re-run `/camel-execute` without regenerating the plan.

**Example:**

```
/camel-execute
(Task 3 fails due to SQL syntax error)

(You manually fix the SQL in the Design Spec)

/camel-execute --resume-from=task-3
(Execution resumes from Task 3 using the same plan)
```

The plan remains valid as long as the Design Specification doesn't change.


<!--step Customizing the Planner-->

## Customizing the Planner

The planning logic is defined in `.claude/commands/camel-plan.md`. You can customize:

- **Task granularity** - Break flows into finer or coarser tasks
- **Wave strategy** - Prefer sequential for simpler debugging, parallel for speed
- **Review process** - Add custom review stages (security review, performance review)

**Example Customization:** Add a "Security Review" stage to every task:

Edit `.claude/commands/camel-plan.md` and update the task template:

```markdown
**Review:**
- Spec compliance: Validate against acceptance criteria
- Code quality: Validate against Constitution
- Security: Validate no hardcoded secrets, proper input validation
```

Now every task includes a three-stage review.


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

All tasks are sequential dependencies. No parallelization.

### Pattern 2: Fan-Out

```
Task 1 → Task 2, Task 3, Task 4 (all parallel)

Wave 1: Task 1
Wave 2: Task 2, Task 3, Task 4
```

One source task fans out to multiple independent destination tasks.

### Pattern 3: Fan-In

```
Task 1, Task 2, Task 3 (all parallel) → Task 4

Wave 1: Task 1, Task 2, Task 3
Wave 2: Task 4
```

Multiple independent source tasks converge to one aggregation task.

### Pattern 4: Diamond

```
     Task 1
    ↙      ↘
Task 2      Task 3
    ↘      ↙
     Task 4

Wave 1: Task 1
Wave 2: Task 2, Task 3 (parallel)
Wave 3: Task 4
```

One task splits, parallel processing, then joins.
{{< /carousel >}}

## Summary

`/camel-plan` transforms Design Specifications into Implementation Plans through:

1. **Flow-to-Task Mapping** - Each flow becomes one or more discrete tasks
2. **Acceptance Criteria** - Clear definition of "done" for each task
3. **Component Listing** - Required Camel components per task
4. **Wave Analysis** - Dependency graph and parallel execution plan
5. **Two-Stage Review** - Spec compliance + code quality per task
6. **Auto-Transition** - Automatic progression to code generation after planning completes

The Implementation Plan is the recipe for `/camel-execute`. It specifies what to build, not how to build it.

Next: [/camel-execute](../execute/) to learn how code generation works.
