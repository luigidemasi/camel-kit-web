---
title: "Greenfield Workflow"
weight: 1
description: "Create a new integration from scratch"
toc: false
---

## Overview

The greenfield workflow guides you through building a new Apache Camel integration from requirements to generated code and runtime-verification evidence. The AI conducts a structured interview, decomposes the design into tasks, generates implementation code, and reports which runtime checks passed, failed, or could not run.

This guide walks through a complete example: building an order processing integration.

{{< carousel id="greenfield-steps" >}}
<!--step Initialize the Project-->

Create a new Camel-Kit project with your preferred AI agent:

```bash
camel-kit init order-processing --ai claude
cd order-processing
```

Your AI agent (Claude Code in this example) now has access to the Camel-Kit pipeline commands.

<!--step Start the Design Interview-->

The first pipeline run needs an active pipeline ID. Because `init` does not create
one, `/camel-brainstorm` prompts you to create it when none exists:

```bash
camel-kit nextId order-processing
# Camel JBang plugin equivalent: camel kit nextId order-processing
```

Then launch the design phase by invoking the `/camel-brainstorm` command:

```
/camel-brainstorm
```

The interview adapts to what you have already supplied and asks one unresolved question at a time:

- **Project questions (Q1–4)** establish the name, business purpose, systems landscape, and integration goals or flow names.
- **Per-flow questions (Q5–9)** cover each flow's intent and data, source, transformations, sink, and error handling, with field-mapping, routing, and resilience follow-ups only when needed.
- **Cross-cutting questions (Q10–13)** cover relevant performance, security, monitoring, and remaining constraints; categories that do not apply are recorded with a rationale.

The AI first analyzes any requirements, examples, or other project material you provide and does not re-ask facts that are already resolved. Complete material can require no clarification questions. The examples below illustrate possible exchanges rather than a fixed checklist:

{{< accordion title="💼 Business Purpose" >}}
The AI first asks about the high-level business goal:

```
AI: What business problem does this integration solve? 
    What is the primary purpose?

You: We need to process incoming orders from an HTTP API, 
     validate them, enrich with customer data, and send 
     to our fulfillment system.
```
{{< /accordion >}}

{{< accordion title="🔌 Systems and Endpoints" >}}
The AI identifies source and destination systems:

```
AI: What systems will this integration connect? Where does 
    data come from and where does it go?

You: Orders arrive via REST POST at /api/orders. Customer 
     data comes from a PostgreSQL database. Validated orders 
     go to a Kafka topic called "fulfillment.orders".
```
{{< /accordion >}}

{{< accordion title="📄 Data Formats" >}}
The AI determines input and output formats:

```
AI: What data formats are involved? JSON, XML, CSV?

You: Orders arrive as JSON. Customer enrichment adds fields 
     from the database. Output to Kafka is also JSON.
```
{{< /accordion >}}

{{< accordion title="⚙️ Processing Requirements" >}}
The AI digs into transformation logic:

```
AI: What transformations or business logic need to happen? 
    Any validation rules?

You: Validate that order amount > 0 and customer ID exists. 
     Enrich with customer email and address from the database. 
     Calculate order total including tax.
```
{{< /accordion >}}

{{< accordion title="🚨 Error Handling" >}}
The AI asks about failure scenarios:

```
AI: How should the integration handle errors? Dead letter 
    queues? Retry logic?

You: Invalid orders should go to a separate Kafka topic 
     "orders.invalid" with the validation error. Database 
     failures should retry 3 times with exponential backoff.
```
{{< /accordion >}}

{{< accordion title="📊 Performance Requirements" >}}
The AI captures non-functional requirements:

```
AI: What are the throughput and latency requirements?

You: We expect 100-500 orders per minute during peak hours. 
     Processing should complete within 2 seconds per order.
```
{{< /accordion >}}

After requirements are complete and before assembling the design, the AI verifies every source and sink component against the MCP catalog. In this example, it confirms that `kafka` exists for the selected Camel version and runtime.

<!--step Review and Approve the Design Specification-->

After discovery, the AI generates a formal **Design Specification** with exactly six sections:

| Section | Content |
|---------|---------|
| **1. Executive Summary** | Business purpose, value, and success criteria |
| **2. Systems Landscape** | Systems, protocols, and source/target roles |
| **3. Flow Designs** | Per-flow source, sink, processing, data, configuration, error handling, and verified technical choices |
| **4. Cross-Cutting Concerns** | Applicable performance, security, monitoring, and constraints |
| **5. Constitution Compliance** | How every flow satisfies the eight project rules |
| **6. Project Structure** | Planned routes, configuration, tests, and supporting artifacts |

Review this carefully. Once you approve, the AI proceeds to planning. To approve: *"Looks good, let's proceed!"*

<!--step Automatic Task Decomposition-->

The AI automatically invokes `/camel-plan` and decomposes the design into route,
configuration, dependency, test, and conditional infrastructure tasks. The table
below shows selected route tasks; supporting artifact and test tasks are omitted
for brevity:

| Task | Acceptance Criteria | Camel components / patterns | Wave |
|------|-------------------|-----------------------------|------|
| **1. REST Endpoint** | Listen at `/api/orders`, POST, return 202 | `platform-http`, `jackson` | 1 |
| **2. Validation** | Check amount > 0, customer_id present | `bean`; `choice` EIP | 2 |
| **3. Enrichment** | Query PostgreSQL, add email + address | `sql`, `jackson` | 2 |
| **4. Tax Calculation** | Compute tax, set total = amount + tax | `bean` | 3 |
| **5. Kafka Publisher** | Publish to `fulfillment.orders`, order ID as key | `kafka` | 4 |
Error retry and dead-letter behavior is included in the affected route tasks unless
error delivery is itself a distinct business flow. Tasks in the same wave can run
**in parallel when the agent supports concurrency**; later waves wait for their
declared dependencies.

<!--step Review the Generated Plan-->

The AI shows the task breakdown and wave analysis for visibility. The plan is a recipe, not the implementation: it specifies what to build and how to verify it without embedding the generated code. The earlier design approval already authorizes downstream work, so there is no second plan-approval prompt.

<!--step Orchestrated Code Generation-->

After writing the plan, `/camel-plan` automatically invokes `/camel-execute` under the existing design approval:

```
Auto-invoking /camel-execute to implement the plan...
```

For each task, the executor dispatches the persona and guides declared by the plan.
Route and configuration tasks use `camel-implement`; test tasks use `camel-test`.
Every task then goes through the applicable review stages:

1. **Implements** - Generates the task's declared artifact with its assigned skill
2. **Adversarial Review** - A fresh-context moderator and parallel critics inspect the task diff where supported; single-conversation targets such as Bob 1 and Pi run the critic lenses sequentially and record the missing isolation. Verified failures return to implementation before staged review.
3. **Spec Compliance Review** - Validates the route matches the task's acceptance criteria
4. **Code Quality Review** - Checks constitution compliance (single responsibility, observability, external config, etc.)

You'll see progress updates:

```
Wave 1/4: Task 1 (REST Endpoint)
  - Implementing route...
  - Adversarial review: PASS
  - Spec compliance: PASS
  - Code quality: PASS
  - Task 1 complete

Wave 2/4: Running 3 independent tasks concurrently where supported...
  Task 2 (Validation Flow)
    - Implementing route...
    - Spec compliance: PASS
    - Code quality: PASS
  
  Task 3 (Customer Enrichment)
    - Implementing route...
    - Spec compliance: PASS
    - Code quality: PASS
  
  Task 6 (Dead Letter Queue)
    - Implementing route...
    - Spec compliance: PASS
    - Code quality: PASS
```

All routes follow the constitution:
- Single responsibility per route
- Separation of concerns (reception → validation → enrichment → publish)
- Observability (route IDs and descriptions, with context-specific correlation and logging)
- External configuration (database URL, Kafka brokers from application.properties)
- Only supported components (verified via MCP catalog)

<!--step Runtime Verification-->

During `/camel-execute`, the AI dispatches internal `camel-verify` after implementation:

```
Dispatching camel-verify to validate the integration...
```

The verification loop runs three phases after execute's environment probe:

| Phase | What happens | Output |
|-------|-------------|--------|
| **1. Build / startup smoke** | Compile with `./mvnw` (or system `mvn` when no wrapper exists); Camel Main projects run a startup smoke test instead | PASS, SKIPPED, or FAILED with the reason |
| **2. Test** | Recursively discover `*.it.yaml` files and run `camel test run {test-files}` when the Camel test CLI is available; tests that declare Testcontainers additionally require Docker, while container-free and mock-only tests still run | Passed-test count, or an explicit skip/failure |
| **3. Report** | Summarize checks, fixes, failures, and skipped phases | PASS, PARTIAL, FAIL, or NOT_RUN |

Build and test failures enter bounded classify/fix/retry loops (up to 15 attempts); the Camel Main startup smoke test allows up to 6 attempts. Missing tools skip their dependent checks with a recorded reason. Verification is informational and does not block `/camel-execute` from finishing, so review its report and resolve any failed or skipped checks before deployment.

{{< /carousel >}}

## What You Built

In one session, without writing code directly, you created:

- 5 Camel YAML route files
- Integration tests using Citrus framework
- Docker Compose setup when external services require it
- Configuration management with external properties
- Retry and dead-letter handling within the affected routes
- Observability with route IDs and descriptions, plus context-specific correlation and logging

All code follows the constitution's 8 architecture rules and passed the adversarial pre-filter plus two-stage review per task.

## Next Steps

{{< carousel id="next-steps" >}}
<!--step Generated Artifacts-->

If you select Camel Main during design, routes and properties are generated at the project root and no `pom.xml` is required:

{{< filetree >}}
order-processing/
  order-reception.camel.yaml
  order-validation.camel.yaml
  customer-enrichment.camel.yaml
  tax-calculation.camel.yaml
  kafka-publisher.camel.yaml
  application.properties
  run.sh
  src/
    test/
      resources/
        order-reception.camel.it.yaml
        order-validation.camel.it.yaml
        ... one .camel.it.yaml file per flow
        application-test.properties
        jbang.properties
  docker-compose.yaml  (only when external services require it)
{{< /filetree >}}

All routes follow the constitution's 8 rules and passed the adversarial pre-filter plus two-stage review.

<!--step Customize & Deploy-->

Once the implementation is generated, review its execution report and resolve any failed or skipped verification checks before deployment:

- **Customize** — Edit generated routes to add business-specific logic
- **Deploy** — Use the generated `run.sh` for Camel Main or package a runtime-appropriate container image
- **Monitor** — Use route IDs and descriptions plus the project-specific monitoring configured from your requirements
- **Extend** — Run `/camel-brainstorm <pipeline-id>` to amend the approved design, then regenerate stale downstream artifacts

<!--step Common Variations-->

**Async Processing** — mention during the interview: *"Orders should be processed asynchronously with 10 concurrent threads"* → AI uses SEDA component.

**DataMapper** — for JSON-to-JSON mapping, DataMapper uses inline Groovy when both schemas are absent or the mapping has fewer than 20 leaf fields; it uses XSLT only when the mapping has at least 20 leaf fields and at least one schema.

**Multiple Environments** — say *"We need dev, staging, and production configurations"* → AI generates `application-{env}.properties` files.

<!--step Troubleshooting-->

**A route breaks later?** Run `/camel-debug` for structured diagnosis. Failures during `/camel-execute` are handled by its internal verification loop.

**Design changes after approval?** Run `/camel-brainstorm <pipeline-id>` with the new requirements, then regenerate stale downstream artifacts.

**Constitution rules too strict?** Edit `docs/constitution.md` before running the pipeline. The 8 rules are customizable per team.
{{< /carousel >}}

## Summary

The greenfield workflow transforms requirements into an implementation and verification evidence through four phases:

1. **/camel-brainstorm** - Socratic interview → Design Specification
2. **/camel-plan** - Task decomposition → Implementation Plan
3. **/camel-execute** - Wave-based execution → Camel YAML routes
4. **/camel-validate** - Static quality analysis → Validation report

Runtime verification runs internally during execute. The design approval remains the pipeline's required human gate while the AI handles implementation mechanics.
