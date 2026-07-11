---
title: "Greenfield Workflow"
weight: 1
description: "Create a new integration from scratch"
toc: false
---

## Overview

The greenfield workflow guides you through building a new Apache Camel integration from requirements to working code in minutes. The AI conducts a structured interview, decomposes the design into tasks, generates implementation code, and verifies everything works at runtime.

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

Launch the design phase by invoking the `/camel-brainstorm` command:

```
/camel-brainstorm
```

The AI begins a Socratic interview covering six areas. Expand each to see an example conversation:

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

Throughout the interview, every component name is verified against the MCP catalog. When you mention "Kafka," the AI checks that `camel-kafka` exists in your target version.

<!--step Review and Approve the Design Specification-->

After the interview, the AI generates a formal **Design Specification** with 7 sections:

| Section | Content |
|---------|---------|
| **1. Business Purpose** | Process orders via REST, validate, enrich, publish to fulfillment |
| **2. Integration Flows** | 6 flows: reception, validation, enrichment, tax, publishing, error handling |
| **3. Systems & Endpoints** | HTTP `/api/orders` → PostgreSQL → Kafka topics |
| **4. Data Formats** | JSON in → SQL enrichment → JSON out |
| **5. Error Handling** | Validation → DLQ, DB errors → retry 3x, Kafka → log & alert |
| **6. Technical Requirements** | `camel-rest`, `camel-jackson`, `camel-sql`, `camel-kafka` — 500 orders/min |
| **7. Observability** | Metrics, logging, external config via `application.properties` |

Review this carefully. Once you approve, the AI proceeds to planning. To approve: *"Looks good, let's proceed!"*

<!--step Automatic Task Decomposition-->

The AI automatically invokes `/camel-plan` and decomposes the design into tasks:

| Task | Acceptance Criteria | Components | Wave |
|------|-------------------|------------|------|
| **1. REST Endpoint** | Listen at `/api/orders`, POST, return 202 | `camel-rest`, `camel-jackson` | 1 |
| **2. Validation** | Check amount > 0, customer_id present | `camel-bean`, `camel-choice` | 2 |
| **3. Enrichment** | Query PostgreSQL, add email + address | `camel-sql`, `camel-jackson` | 2 |
| **4. Tax Calculation** | Compute tax, set total = amount + tax | `camel-bean` | 3 |
| **5. Kafka Publisher** | Publish to `fulfillment.orders`, order ID as key | `camel-kafka` | 4 |
| **6. Dead Letter Queue** | Publish to `orders.invalid` with error message | `camel-kafka`, `camel-log` | 2 |

Wave 2 tasks run **in parallel** (independent). Waves 3–4 are **sequential** (dependent).

<!--step Approve the Plan-->

Review the task breakdown and wave analysis. The plan is your recipe, not the implementation. It specifies what to build, not how.

To approve:
```
Approved, let's build it!
```

<!--step Orchestrated Code Generation-->

The AI automatically invokes `/camel-execute` after plan approval:

```
Auto-invoking /camel-execute to implement the plan...
```

For each task, the AI:

1. **Implements** - Generates the Camel YAML route using the `camel-implement` skill
2. **Spec Compliance Review** - Validates the route matches the task's acceptance criteria
3. **Code Quality Review** - Checks constitution compliance (single responsibility, observability, external config, etc.)

You'll see progress updates:

```
Wave 1/4: Task 1 (REST Endpoint)
  - Implementing route...
  - Spec compliance: PASS
  - Code quality: PASS
  - Task 1 complete

Wave 2/4: Running 3 tasks in parallel...
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
- Observability (metrics and logging)
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
| **1. Build** | `./mvnw clean package` | Build successful |
| **2. Test** | Citrus integration tests with Testcontainers | 4/4 passed |
| **3. Report** | Summary of checks and fixes | ✅ Integration ready |

If any phase fails, the AI classifies the error (build/runtime/test/config), fixes it, and retries — up to 15 times per phase.

{{< /carousel >}}

## What You Built

In one session, without writing code directly, you created:

- 6 Camel YAML routes
- Integration tests using Citrus framework
- Docker Compose environment setup
- Configuration management with external properties
- Error handling and dead letter queue
- Observability with metrics and logging

All code follows the constitution's 8 architecture rules and passed two-stage review per task.

## Next Steps

{{< carousel id="next-steps" >}}
<!--step Generated Artifacts-->

Your project now contains:

{{< filetree >}}
order-processing/
  src/
    main/
      resources/
        routes/
          order-reception.camel.yaml
          order-validation.camel.yaml
          customer-enrichment.camel.yaml
          tax-calculation.camel.yaml
          kafka-publisher.camel.yaml
          error-handler.camel.yaml
        application.properties
    test/
      java/
        OrderProcessingIT.java
  docker-compose.yaml
  pom.xml
{{< /filetree >}}

All routes follow the constitution's 8 rules and passed two-stage review.

<!--step Customize & Deploy-->

Now that your integration is working:

- **Customize** — Edit generated routes to add business-specific logic
- **Deploy** — Package as a Spring Boot JAR or container image
- **Monitor** — Use the built-in metrics for observability
- **Extend** — Run `/camel-brainstorm` again to add new flows

<!--step Common Variations-->

**Async Processing** — mention during the interview: *"Orders should be processed asynchronously with 10 concurrent threads"* → AI uses SEDA component.

**DataMapper** — for complex JSON-to-JSON mapping, the AI offers XSLT-based DataMapper with field-by-field mapping.

**Multiple Environments** — say *"We need dev, staging, and production configurations"* → AI generates `application-{env}.properties` files.

<!--step Troubleshooting-->

**A route breaks later?** Run `/camel-debug` for structured diagnosis. Failures during `/camel-execute` are handled by its internal verification loop.

**Design changes after approval?** Run `/camel-brainstorm` again with the new requirements.

**Constitution rules too strict?** Edit `docs/constitution.md` before running the pipeline. The 8 rules are customizable per team.
{{< /carousel >}}

## Summary

The greenfield workflow transforms requirements into working integrations through four phases:

1. **/camel-brainstorm** - Socratic interview → Design Specification
2. **/camel-plan** - Task decomposition → Implementation Plan
3. **/camel-execute** - Wave-based execution → Camel YAML routes
4. **/camel-validate** - Static quality analysis → Validation report

Runtime verification runs internally during execute. The design approval remains the pipeline's required human gate while the AI handles implementation mechanics.
