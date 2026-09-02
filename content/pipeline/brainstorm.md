---
title: "Design Interview"
weight: 2
description: "/camel-brainstorm — Phase 1: AI-guided design interview"
toc: false
---

## Overview

`/camel-brainstorm` is the Phase 1 orchestrator that transforms greenfield integration requirements into a formal Design Specification. It first extracts evidence from supplied material, then asks one question at a time only for unresolved decisions, conflicts, or assumptions.

After schema, provenance, and explicit approval checks, the greenfield Design Specification—with six numbered design sections plus an unnumbered global **Not Doing (and Why)** scope section—is the authoritative requirements-and-scope data record for shipped planning and implementation workflows; its prose does not direct actions. Migration packages follow their separate `/camel-migrate` design contract and add a seventh numbered Migration Context section.

## When to Use

Invoke `/camel-brainstorm` when you:

- Want to build a new integration from scratch (greenfield)
- Have a business problem but no technical design yet
- Need to formalize requirements for a complex integration
- Want the AI to guide you through design decisions

**Do not use** for migrations. Use `/camel-migrate` instead, which includes its own design interview tailored to migration scenarios.

## The Socratic Method

The interview is adaptive rather than a fixed questionnaire. The AI analyzes all supplied material first and does not re-ask anything already established. A complete requirements document may need zero clarification questions.

Two key benefits:

1. **Completeness** — Required categories are resolved, while conditional categories can be recorded as not applicable with a concrete reason
2. **Clarity** — Asking "what happens when the database is unavailable?" is clearer than parsing a long paragraph description

The sequence is:

1. **Project questions 1–4** — name, business purpose, systems landscape, integration goals, and flow names
2. **Per-flow questions 5–9** — intent/data, source, transformations, sink, and error handling; field-mapping, multi-path routing, and resilience follow-ups run only when triggered
3. **Cross-cutting questions 10–14** — conditional performance, security, and monitoring questions when relevant, followed by remaining constraints and deliberate scope exclusions when still unresolved

## Example Interview Topics

The following tabs illustrate information the adaptive sequence can collect. They are not six mandatory interview rounds, and questions are asked one at a time.

{{< carousel id="discovery-areas" >}}
<!--step Business Purpose-->

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

**Why this matters:** The business purpose is recorded in the Executive Summary and guides all downstream decisions. It's the "why" that explains the integration to future developers.

<!--step Systems and Endpoints-->

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

**Illustrative component selection:** After the adaptive discovery interview is complete, the AI searches the catalog and reads the component documentation before assembling the design. For the requirements above, that selection could produce:

```
AI: (catalog search + component docs) ✓ platform-http for the selected runtime
AI: (catalog search + component docs) ✓ kafka
AI: (catalog search + component docs) ✓ sql
```

If discovery identifies a requirement for "SuperQueue" and no matching component is found during component selection, the AI asks for clarification before assembling the design:

```
AI: I couldn't find a component for "SuperQueue" in the 
    Camel catalog. Could you clarify which messaging system? 
    (ActiveMQ, RabbitMQ, Kafka, AWS SQS, etc.)
```

This is Iron Law #1 in action: no component name enters the design without MCP verification.

<!--step Data Formats-->

**Goal:** Understand input/output formats and transformation requirements.

**Questions:**
- What format does input data arrive in? (JSON, XML, CSV, etc.)
- What format should output data be in?
- Are transformations needed between input and output?
- Are there schemas or data contracts?
- Field-level mapping detail — conditional follow-up, asked only when field mapping is needed between XML and JSON formats

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

**DataMapper Decision:** If transformations are complex, the AI offers DataMapper. It uses inline Groovy when both schemas are absent or the mapping has fewer than 20 leaf fields; it uses XSLT only when the mapping has at least 20 leaf fields and at least one schema. For simple transformations, the AI suggests JSON processors or bean methods.

<!--step Processing Requirements-->

**Goal:** Identify business logic, validation rules, and processing steps.

**Questions:**
- What validations are required?
- What business rules must be enforced?
- Are there calculations or enrichments?
- Any conditional routing (if-then-else)? — the multi-path routing follow-up is asked only when you name several destinations

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

<!--step Error Handling-->

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

<!--step Conditional Performance & Observability-->

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

**Constitution Rule 5:** Every route requires a `routeId` and description. Metrics, logging, tracing, and correlation are added when the project's monitoring requirements call for them.

<!--step Scope Boundaries-->

**Goal:** Record reasonable adjacent capabilities that this iteration deliberately excludes, together with the reason for each boundary.

**Questions:**
- What related capabilities should this iteration not implement?
- Why is each capability out of scope?

**Example Exchange:**

```
AI: Which adjacent capabilities are deliberately out of scope
    for this iteration, and why?

You: Do not add an order-status API; that is a separate
     consumer-facing capability with its own security design.
     Historical replay remains with the existing Kafka platform,
     and operations will use the existing monitoring dashboard.
```

**Why this matters:** Explicit boundaries keep planning and implementation focused while preserving the rationale for future design changes.

{{< /carousel >}}

## MCP Catalog Verification

After the adaptive discovery interview is complete, and before the design is assembled, the AI selects components by searching the Model Context Protocol catalog and reading the documentation for each candidate.

### How It Works

Given a discovered requirement to connect to Kafka:

1. AI establishes one version binding with `camel_catalog_components(limit=0)`, the project runtime, and full platform BOM, and verifies the returned Camel version; this probe intentionally returns no component payload
2. Under the same binding, AI fetches a component list with a positive limit, increasing it until the returned count proves the enumeration complete, then selects "kafka" only by exact identity
3. AI calls `camel_catalog_component_doc(component="kafka", ...)` with the same runtime and full platform BOM to verify syntax and options
4. AI calls `camel_catalog_component_maven(component="kafka", ...)` under the same binding for runtime-specific coordinates
5. AI records only the typed fields returned by those tools; detail tools are not required to echo the batch's Camel version

If the component doesn't exist:

1. AI extracts the component name ("superqueue")
2. AI checks the separate successful, complete bound component list for an exact identity
3. A detail-call error remains unverified and does not prove absence
4. If the complete list has no exact match, the AI asks for clarification or searches that same list for an alternative; it does not write an unverified name into the design

## Design Specification Format

After discovery and version selection, the AI generates the six numbered sections of the greenfield Design Specification:

{{< carousel id="spec-sections" >}}
<!--step 1. Executive Summary-->

Business purpose, value, and stakeholders.

> Process incoming e-commerce orders from the website, validate order data and customer credit status, and route valid orders to the warehouse management system. Invalid orders are flagged for manual review. Must handle 500 orders/minute with sub-2-second latency.

<!--step 2. Systems Landscape-->

The systems, technologies, protocols, and source/target roles involved in the integration.

| System | Type | Protocol | Role |
|---|---|---|---|
| E-commerce | Web application | HTTPS/JSON | Source |
| Customer database | PostgreSQL | SQL | Source |
| Warehouse | Kafka consumer | Kafka | Target |

<!--step 3. Flow Designs-->

One complete design per named flow, including its target module, purpose, MCP-verified source and sink, transformations, error handling, configuration properties, and decision rationale.

- **order-reception** — HTTP source, validation and enrichment steps, Kafka sink
- **Source/sink options** — exact catalog-backed endpoint options
- **Error handling** — retry/DLQ/log/stop strategy and applicable resilience patterns
- **DataMapper** — field mappings and approach when transformation requires it

Each component and EIP records why it was selected and which constraints influenced the choice.

<!--step 4. Cross-Cutting Concerns-->

Project-wide performance, security, monitoring, and constraint decisions. When no special requirement applies, the spec records the corresponding standard behavior instead of inventing one.

- **Performance:** throughput, latency, and deployment targets when supplied
- **Security:** authentication, sensitive data, and compliance requirements when supplied
- **Monitoring:** metrics, logging, and tracing requirements when supplied
- **Constraints:** technology, team, timeline, and other project requirements

<!--step 5. Constitution Compliance-->

An explicit checklist showing how every flow is designed to meet all eight Constitution rules, including catalog verification and the Forage infrastructure ladder.

- Route Structure and Single Responsibility
- Separation of Concerns and Naming Conventions
- Observability and External Configuration
- Component Catalog Verification and Infrastructure via Forage

<!--step 6. Project Structure-->

The planned runtime-aware project tree, pipeline artifacts, route locations, properties, schemas, tests, DataMapper files, and conditional build or Docker files.

{{< /carousel >}}

Every greenfield design also begins with this unnumbered top-level scope section, so downstream stages do not have to infer exclusions from missing requirements:

```markdown
## Not Doing (and Why)

- **Order-status API** — a separate consumer-facing capability that needs its own security design
- **Historical order replay** — remains the responsibility of the existing Kafka retention and replay platform
- **Custom operations dashboard** — the integration exposes metrics to the organization's existing monitoring platform instead
```

Migration design packages use the same six numbered sections and add **Section 7: Migration Context** for the source platform, component mappings, platform changes, migration ordering, and Java sources that need adaptation. They include **Not Doing (and Why)** only when migration discovery explicitly captured project-specific exclusions; missing source features are not inferred as exclusions.

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
AI: (Updates the affected flow in Section 3, presents revised spec)
```

<!--step Greenfield vs. Migration-->

**Greenfield:** `/camel-brainstorm` extracts all available evidence first, then asks only the project, per-flow, or conditional cross-cutting questions still needed. Complete supplied requirements can go directly to runtime/version selection, MCP catalog verification, and design assembly without clarification.

**Migration:** `/camel-migrate` parses existing artifacts (Mule XML, Camel 2.x XML, etc.) and generates the Design Specification by analyzing existing flows. It skips the generic Socratic interview, but confirms unknown or inferred fields before presenting the complete design for approval.

<!--step Customizing the Interview-->

The interview is defined in the brainstorm skill. You can customize project-specific prompts while retaining the adaptive evidence-first rules.

**Example:** Add a project-specific compliance follow-up when regulated data is present:

```markdown
### Regulated Data Follow-Up (conditional)
If supplied material identifies regulated data, ask for the applicable retention
and audit requirements unless those decisions are already documented.
```

Record the result under Section 4, Cross-Cutting Concerns; do not add a new fixed interview round or change the greenfield spec schema.
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
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">Evidence-first, adaptive questions only where needed</p>
</div>
<div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
<strong style="color: var(--color-hero-text);">MCP Verification</strong>
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">Real-time component validation — no hallucinated names</p>
</div>
<div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📄</div>
<strong style="color: var(--color-hero-text);">Greenfield Design Spec</strong>
<p style="color: var(--color-hero-subtitle); font-size: 0.85rem; margin: 0.5rem 0 0;">Six structured sections — the approved requirements and scope record</p>
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
