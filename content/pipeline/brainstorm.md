---
title: "Design Interview"
weight: 1
description: "/camel-brainstorm — Phase 1: AI-guided design interview"
toc: false
---

## Overview

`/camel-brainstorm` is the Phase 1 orchestrator that transforms vague integration ideas into formal Design Specifications. Through Socratic questioning, the AI guides you through requirements discovery, system identification, data format analysis, and error handling strategy.

The output is a structured 7-section Design Specification that serves as the single source of truth for planning and implementation.

## When to Use

Invoke `/camel-brainstorm` when you:

- Want to build a new integration from scratch (greenfield)
- Have a business problem but no technical design yet
- Need to formalize requirements for a complex integration
- Want the AI to guide you through design decisions

**Do not use** for migrations. Use `/camel-migrate` instead, which includes its own design interview tailored to migration scenarios.

## The Socratic Method

The AI doesn't ask you to "describe your integration." Instead, it guides you through six discovery areas using open-ended questions that build on your previous answers.

Two key benefits:

1. **Completeness** — Structured questions ensure you don't forget critical aspects like error handling or observability
2. **Clarity** — Asking "what happens when the database is unavailable?" is clearer than parsing a long paragraph description

The AI adapts questions based on your answers, creating a conversation flow rather than a rigid questionnaire.

## The Six Discovery Areas

{{< carousel id="discovery-areas" >}}
<!--step 1. Business Purpose-->

**Goal:** Understand the high-level business value and primary use case.

**Questions:**
- What business problem does this integration solve?
- What is the primary purpose or outcome?
- Who are the users or consumers of this integration?

**Example Exchange:**

```
AI: What business problem does this integration solve?

You: We have orders coming from an e-commerce website that 
     need to be validated and sent to our warehouse management 
     system for fulfillment.

AI: What is the primary outcome you want to achieve?

You: Ensure every valid order reaches the warehouse system 
     within 2 seconds, and invalid orders are flagged for 
     manual review.
```

**Why this matters:** The business purpose becomes the first section of the Design Specification and guides all downstream decisions. It's the "why" that explains the integration to future developers.

<!--step 2. Systems and Endpoints-->

**Goal:** Identify all systems involved and their connection details.

**Questions:**
- Where does data come from (source systems)?
- Where does data go (destination systems)?
- What protocols or APIs are used?
- Are there intermediary systems (enrichment, validation)?

**Example Exchange:**

```
AI: Where do orders come from?

You: The e-commerce website posts orders to an HTTP endpoint 
     we need to expose.

AI: What is the destination for validated orders?

You: They go to a Kafka topic called "warehouse.orders" 
     that our WMS consumes.

AI: Do you need to connect to any other systems for 
     enrichment or validation?

You: Yes, we need to look up customer credit status in 
     a PostgreSQL database before sending to the warehouse.
```

**MCP Verification:** As you mention systems, the AI verifies component names:

```
AI: (MCP lookup: "http") ✓ camel-rest
AI: (MCP lookup: "kafka") ✓ camel-kafka
AI: (MCP lookup: "postgresql") ✓ camel-sql
```

If you say "We need to use SuperQueue," the AI responds:

```
AI: I couldn't find a component for "SuperQueue" in the 
    Camel catalog. Could you clarify which messaging system? 
    (ActiveMQ, RabbitMQ, Kafka, AWS SQS, etc.)
```

This is Iron Law #1 in action: no component name enters the design without MCP verification.

<!--step 3. Data Formats-->

**Goal:** Understand input/output formats and transformation requirements.

**Questions:**
- What format does input data arrive in? (JSON, XML, CSV, etc.)
- What format should output data be in?
- Are transformations needed between input and output?
- Are there schemas or data contracts?

**Example Exchange:**

```
AI: What format do orders arrive in from the website?

You: JSON with fields like orderId, customerId, items array, 
     and totalAmount.

AI: What format does the Kafka message need to be?

You: Also JSON, but we need to add customer credit status 
     and warehouse location code.

AI: This sounds like a field-level transformation. Would you 
     like to use DataMapper for reliable mapping, or simple 
     JSON manipulation?

You: Let's use DataMapper since this needs to be very reliable.
```

**DataMapper Decision:** If transformations are complex, the AI offers DataMapper (XSLT-based). For simple transformations, it suggests JSON processors or bean methods.

<!--step 4. Processing Requirements-->

**Goal:** Identify business logic, validation rules, and processing steps.

**Questions:**
- What validations are required?
- What business rules must be enforced?
- Are there calculations or enrichments?
- Any conditional routing (if-then-else)?

**Example Exchange:**

```
AI: What validations are needed for incoming orders?

You: The orderId must be unique, totalAmount must be greater 
     than zero, and customerId must exist in our database.

AI: What should happen if validation fails?

You: Invalid orders go to a separate Kafka topic "orders.invalid" 
     for manual review, with the validation error message included.

AI: You mentioned adding credit status. What's the business rule?

You: If creditStatus is "BLOCKED", don't send to warehouse. 
     Route to "orders.pending" topic instead.
```

**Conditional Routing:** The AI identifies choice/when patterns and includes them in the design.

<!--step 5. Error Handling-->

**Goal:** Define how failures are handled across different failure modes.

**Questions:**
- What should happen if source system is unavailable?
- What about destination system failures?
- Should there be retries? How many?
- Dead letter queues or error topics?
- Alerting or notifications on errors?

**Example Exchange:**

```
AI: What should happen if the database lookup for customer 
    credit status fails?

You: Retry up to 3 times with exponential backoff. If all 
     retries fail, send to "orders.error" topic.

AI: What about Kafka publish failures?

You: Kafka should be highly available, but if publish fails, 
     log the error and retry indefinitely until it succeeds.

AI: Should anyone be notified of errors?

You: Yes, send an email to ops@company.com if we get more 
     than 10 database failures in 5 minutes.
```

**Error Classification:** The AI categorizes errors:
- **Transient errors** → retry
- **Validation errors** → route to dead letter / invalid topic
- **System errors** → alert

<!--step 6. Performance & Observability-->

**Goal:** Capture non-functional requirements and monitoring needs.

**Questions:**
- What is the expected throughput?
- What are latency requirements?
- How should metrics be exposed?
- What logging is needed?
- Any tracing requirements?

**Example Exchange:**

```
AI: What is the expected order volume?

You: Peak hours see about 500 orders per minute. Off-peak 
     is around 50 per minute.

AI: What latency is acceptable?

You: Each order should be processed end-to-end in under 
     2 seconds.

AI: What metrics do you need to track?

You: Total orders received, validation pass rate, database 
     lookup time, Kafka publish time, and error count by type.
```

**Constitution Rule 5:** Observability is mandatory. The AI ensures metrics and logging are included in the design.

{{< /carousel >}}

## MCP Catalog Verification

Throughout the interview, every mentioned component is verified in real-time against the Model Context Protocol catalog.

### How It Works

When you say "I need to connect to Kafka":

1. AI extracts the component name ("kafka")
2. AI calls MCP tool: `camel_catalog_lookup("kafka")`
3. MCP responds with component details:
   ```json
   {
     "name": "camel-kafka",
     "title": "Kafka",
     "description": "Sent and receive messages to/from an Apache Kafka broker",
     "version": "4.14.4"
   }
   ```
4. AI confirms: "I'll use the `camel-kafka` component."

If the component doesn't exist:

1. AI extracts the component name ("superqueue")
2. AI calls MCP tool: `camel_catalog_lookup("superqueue")`
3. MCP responds: `null` (not found)
4. AI asks for clarification: "I couldn't find a component for SuperQueue. Which messaging system are you using?"

### Supported vs. Unsupported Components

**Constitution Rule 7:** Only Apache Camel supported components are allowed.

The AI cross-references the catalog lookup with the supported components list. If you mention a component that exists but isn't in the Apache Camel catalog:

```
AI: I found the camel-example component in the catalog, but 
    it's not supported by Apache Camel. 
    Would you like to use a supported alternative?
```

This prevents production deployments of unsupported or community-only components.

## Design Specification Format

After the interview, the AI generates a formal Design Specification. Navigate through the 7 sections:

{{< carousel id="spec-sections" >}}
<!--step 1. Business Purpose-->

High-level description of the integration's business value.

> Process incoming e-commerce orders from the website, validate order data and customer credit status, and route valid orders to the warehouse management system. Invalid orders are flagged for manual review. Must handle 500 orders/minute with sub-2-second latency.

<!--step 2. Integration Flows-->

List of distinct flows that make up the integration.

- **Order Reception** — REST endpoint for POST requests
- **Order Validation** — schema and business rules
- **Customer Credit Lookup** — PostgreSQL query
- **Routing Decision** — warehouse / pending / invalid
- **Warehouse Publisher** — Kafka `warehouse.orders`
- **Error Handler** — retries and alerting

<!--step 3. Systems and Endpoints-->

Detailed connection information for all systems.

- **Source:** HTTP POST to `/api/orders` (JSON)
- **Enrichment:** PostgreSQL at `${db.url}`
- **Destinations:** Kafka topics `warehouse.orders`, `orders.pending`, `orders.invalid`
- **Alerts:** SMTP email to `${ops.email}`

All connection details externalized via `application.properties`.

<!--step 4. Data Formats-->

Input/output formats and transformation specifications.

**Input:** JSON with `orderId`, `customerId`, `items[]`, `totalAmount`

**Enriched output:** Same fields + `creditStatus`, `warehouseLocation`

**Transformation:** DataMapper XSLT for reliable field-level mapping.

<!--step 5. Error Handling-->

Detailed strategy for each failure mode:

- **Validation errors** → route to `orders.invalid` (no retry)
- **Database errors** → retry 3x with exponential backoff, then alert
- **Kafka errors** → retry indefinitely (wait for recovery)
- **Credit blocked** → route to `orders.pending` (not an error)

Alert threshold: > 10 database failures in 5 minutes → email ops.

<!--step 6. Technical Requirements-->

**Components:** `camel-rest`, `camel-jackson`, `camel-sql`, `camel-kafka`, `camel-mail`, `camel-bean`

**Performance:**
- Throughput: 500/min peak
- Latency: < 2s per order
- Concurrency: 10 threads

<!--step 7. Observability-->

**Metrics:** order counts, validation failures, DB lookup time, Kafka publish latency

**Logging:** INFO (received), WARN (validation fail), ERROR (DB/Kafka fail)

**External config:** `db.url`, `kafka.brokers`, `ops.email`, `rest.port` — all via `application.properties`
{{< /carousel >}}

## After the Design Specification

Once complete, the AI presents the specification for review. You can approve to proceed to `/camel-plan`, or request changes — the AI revises and re-presents until you're satisfied.

{{< carousel id="after-spec" >}}
<!--step Approval & Changes-->

```
You: Approved, looks great!
AI: Auto-invoking /camel-plan to create the implementation plan...
```

```
You: Can we add a retry strategy for Kafka publish failures?
AI: (Updates Section 5, presents revised spec)
```

<!--step Greenfield vs. Migration-->

**Greenfield:** `/camel-brainstorm` conducts a full Socratic interview because there's no existing implementation to analyze.

**Migration:** `/camel-migrate` parses existing artifacts (Mule XML, Camel 2.x XML, etc.) and generates the Design Specification automatically by analyzing existing flows. It still presents a spec for approval, but skips the interview.

<!--step Customizing the Interview-->

The interview is defined in the brainstorm skill. You can customize questions by editing the skill file.

**Example:** Add security questions to every interview:

```markdown
### Security Requirements
Ask about:
- Authentication and authorization
- Data encryption (in-transit and at-rest)
- Secrets management
- Compliance (GDPR, HIPAA, etc.)
```

Now every design interview includes security, and the spec gains "Section 8: Security Requirements."
{{< /carousel >}}

## Common Interview Patterns

{{< carousel id="interview-patterns" >}}
<!--step Request-Reply-->

**Synchronous request-reply** — HTTP in, database query, HTTP response back.

```
AI: Where does data go?
You: Query a database and return the result in the HTTP response

AI: This is a synchronous request-reply pattern. Should the 
    response wait for the query, or return immediately?

You: Wait for the database query (synchronous)
```

**Design Output:** Single flow: REST → SQL → REST response.

<!--step Fire-and-Forget-->

**Asynchronous fire-and-forget** — accept immediately, process in background.

```
AI: Should the HTTP endpoint wait for Kafka confirmation?

You: Return immediately with HTTP 202 Accepted

AI: Should we use an intermediary queue for reliability?

You: Yes, use SEDA for async processing
```

**Design Output:** Two flows: REST → SEDA (return 202), then SEDA → Kafka.

<!--step Multi-System with Saga-->

**Complex multi-system** — parallel writes with distributed transaction handling.

```
AI: Where does data go?
You: Three places: inventory DB, CRM, and shipping email

AI: Sequence or parallel?
You: Parallel, but rollback all if any fails

AI: This requires Saga pattern. Should we use it?
You: Yes, with compensating transactions
```

**Design Output:** Multi-flow with Saga coordination.
{{< /carousel >}}

---

<div style="background: var(--color-hero-gradient); border-radius: 12px; padding: 2rem; margin: 2rem 0;">
<h2 style="color: var(--color-hero-text); margin-top: 0;">What /camel-brainstorm delivers</h2>
<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
<div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💬</div>
<strong style="color: var(--color-hero-text);">Socratic Interview</strong>
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">Six discovery areas with adaptive questioning</p>
</div>
<div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
<strong style="color: var(--color-hero-text);">MCP Verification</strong>
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">Real-time component validation — no hallucinated names</p>
</div>
<div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📄</div>
<strong style="color: var(--color-hero-text);">7-Section Spec</strong>
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">Structured design document — the single source of truth</p>
</div>
<div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✅</div>
<strong style="color: var(--color-hero-text);">Approval Gate</strong>
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">You approve before any code is generated</p>
</div>
</div>
<p style="color: var(--color-hero-text); text-align: center; margin: 1.5rem 0 0; font-size: 0.9rem;">
Next: <a href="../plan/" style="color: var(--color-hero-subtitle);">/camel-plan →</a> Task decomposition and wave analysis
</p>
</div>
