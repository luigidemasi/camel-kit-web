---
title: "Pipeline"
weight: 2
description: "The design-to-code pipeline — manual stages, plus the controller-owned Ship workflow"
toc: false
---

## Overview

The Camel-Kit pipeline transforms integration requirements into generated code and review evidence through an orchestrated workflow. You can run it two ways:

- **Manual:** Enter through `/camel-start`, `/camel-brainstorm` without an ID, or `/camel-migrate` without an ID for a chained flow. Other independently invoked stages write their output and stop; only stages chained in the same conversation auto-transition.
- **Ship (`/camel-ship`):** Delegate to the local `camel-kit ship` controller, which runs its own workflow — discovery, design, plan, execute, validate — with configurable oversight (`--ask always|smart|never`).

The manual pipeline is agent-run and enforces the Iron Laws at each stage; Ship's stages, state, and gates are owned by the local controller.

## The Four Pipeline Stages

{{< carousel id="pipeline-phases" >}}
<!--step Phase 1: Design-->
## 💡 /camel-brainstorm

**Goal:** Transform vague integration ideas into formal Design Specifications

- Adaptive discovery that reuses complete supplied requirements and asks only unresolved questions
- MCP catalog verification of all components
- Generation of the 6-section greenfield Design Specification

**Output:** Design Specification ready for approval

**Why this matters:** Most AI coding tools jump from prompt to code. This works for scripts but fails for complex integrations. Camel-Kit separates requirements gathering from implementation.

<!--step Phase 2: Plan-->
## 📋 /camel-plan

**Goal:** Break the design into executable tasks with dependencies

- Analyze design spec and identify distinct flows
- Create task breakdown with acceptance criteria
- Build dependency graph for wave analysis

**Output:** Implementation Plan with dependency waves and concurrency candidates

**Why this matters:** Without decomposition, you get a giant blob of code. Tasks enable incremental validation and capability-aware concurrency.

<!--step Phase 3: Execute-->
## ⚙️ /camel-execute

**Goal:** Generate the planned code and collect review and runtime evidence

- Wave-based execution with concurrency only on capable targets
- Adversarial critic pre-filter per task, using nested moderator/critic contexts where supported, parent-owned reviewer dispatch on other multi-agent targets, and a sequential fallback on single-conversation targets such as Bob 1 and Pi
- Ordered two-stage review per task (spec compliance, then code quality)
- Generation of routes, tests, and configuration

**Output:** Runtime-specific project plus `execution-report.md`, including embedded runtime verification evidence; skipped or failed checks remain visible in that report

**Includes:** Internal `camel-verify` runtime validation

<!--step Phase 4: Validate-->
## ✅ /camel-validate

**Goal:** Run static quality analysis after execution

- Validate endpoints and configuration against MCP catalogs
- Check security, anti-patterns, project norms, and all constitution rules
- Produce the final validation report

**Output:** Static validation report for the generated routes
{{< /carousel >}}

## Approval Gate

The design phase has an approval gate. After `/camel-brainstorm` completes, the AI presents the greenfield **Design Specification** with six numbered sections—Executive Summary, Systems Landscape, Flow Designs, Cross-Cutting Concerns, Constitution Compliance, and Project Structure—plus an unnumbered global **Not Doing (and Why)** scope section. Migration design packages follow their separate design-generation workflow and add numbered Section 7, Migration Context.

You must explicitly approve before the pipeline continues. You can request changes — the AI revises and re-presents.

In a chained flow, design approval authorizes the remaining stages without additional approval gates. `/camel-plan` generates the task breakdown and transitions to `/camel-execute`; execute dispatches internal runtime verification, then continues to `/camel-validate` for static quality analysis. An independently invoked known stage writes its own output and stops instead of creating a new chain.

## Iron Laws

Six non-negotiable rules enforced across all phases:

{{< tabs id="iron-laws" >}}
<!--tab 1. MCP Verification-->

Every Apache Camel component name must be **verified against the MCP catalog** before appearing in any design or code. Prevents AI hallucination — no invented component names.

```
User: I need to connect to Kafka

AI: (Calls MCP catalog lookup for "kafka")
    ✓ Found: camel-kafka
```

If a component doesn't exist, the AI asks for clarification instead of guessing.

<!--tab 2. Constitution-->

Every generated route must comply with the **Constitution's 8 rules:**

1. **Route Structure** — every route has a source and sink; `direct:`/`seda:` sub-routes may omit an external sink, and processing-free pass-through routes warn
2. **Single Responsibility** — one route = one business capability
3. **Separation of Concerns** — no business logic in technical routes
4. **Naming Conventions** — route IDs use `<domain>-<action>[-<qualifier>]`, internal endpoints use `direct:<route-id>` or `seda:<domain>-<purpose>`, and custom headers use kebab-case
5. **Observability** — route IDs and descriptions, with correlation and logging at context-specific decision points
6. **External Configuration** — no hardcoded connection strings, credentials, or environment-specific values; use `{{placeholder}}` syntax
7. **Supported Components** — only catalog-verified components
8. **Infrastructure via Forage** — prefer catalog-verified `forage.*` configuration over hand-wired beans

<!--tab 3. No Code Without Design Approval-->

The AI **cannot generate implementation code** until the Design Specification is explicitly approved. In a chained flow, planning and execution then auto-proceed without additional gates. Prevents wasted effort — if the design is wrong, the implementation will be wrong.

`/camel-execute` requires `implementation-plan.md`, which `/camel-plan` derives from the approved design. If no plan exists, it stops with: *"No implementation plan found. Run /camel-plan first."*

<!--tab 4. Spec Before Quality-->

Every artifact must pass **spec compliance review before code quality review**. Two-stage review per task:

1. **Stage 1:** Does this match the spec's acceptance criteria?
2. **Stage 2:** Is this well-written? Does it follow the constitution?

If stage 1 fails, regenerate without running stage 2.

<!--tab 5. Adversarial Review-->

Every generated code artifact passes an adversarial review before spec compliance and quality review. Targets with nested moderator dispatch use fresh moderator and critic contexts; targets whose parent owns orchestration call bounded reviewers and synthesize their evidence there. Single-conversation targets such as Bob 1 and Pi apply the same critic lenses sequentially and record the missing isolation. Bob 1 implements that fallback in its monolithic gate. The critics look for route architecture, security, performance, boundary, and behavioral-equivalence failures.

<!--tab 6. Surgical Changes-->

Implementation touches only what the approved task requires. Adjacent refactors, cleanup, and unrelated TODO work are outside the task boundary.

{{< /tabs >}}

## Internal Skills

Four internal skills are dispatched by pipeline stages as needed; they are not exposed as command stubs:

{{< tabs id="internal-skills" >}}
<!--tab camel-design-->

Provides component selection, integration patterns, and design-assembly guidance during discovery.

<!--tab camel-implement-->

Generates Camel YAML route definitions from task specifications. Uses templates and follows the constitution.

- **Input:** Task description with acceptance criteria
- **Output:** `.camel.yaml` route file
- **Loaded by:** `/camel-execute` for each implementation task

<!--tab camel-test-->

Creates Citrus integration tests for behavioral verification, using Testcontainers only for required external databases or brokers and mocks for external APIs.

- **Input:** Route specification and test scenarios
- **Output:** Citrus YAML test definition at `{module}/src/test/resources/<flow-name>.camel.it.yaml`; omit the entire `{module}/` prefix at the project root
- **Loaded by:** `/camel-execute` during test generation tasks

<!--tab camel-verify-->

Builds, tests, diagnoses, and repairs the generated application in a runtime feedback loop.

- **Input:** Generated application and Citrus tests
- **Output:** Runtime verification evidence embedded in `docs/camel-kit/<pipeline-id>/execution-report.md`
- **Loaded by:** `/camel-execute` after implementation

{{< /tabs >}}

## Pipeline Patterns

{{< tabs id="pipeline-patterns" >}}
<!--tab Greenfield-->

```
You: I need to build an order processing integration

AI: No active pipeline ID → asks you to create one
You: camel-kit nextId order-processing

AI: /camel-brainstorm → Interview → Design Spec
    (You approve)
AI: /camel-plan → Task decomposition → Plan
    (Auto-proceeds)
AI: /camel-execute → Wave-based generation → Code
    → internal camel-verify → Build → Test → Report
AI: /camel-validate → Static quality report

Total: 1 pipeline entry command, 1 approval, 4 phases,
       plus first-run pipeline ID creation when needed
```

<!--tab Migration-->

```
You: Migrate my MuleSoft/BizTalk flows to Camel

AI: /camel-migrate → Detect → Parse → Graph → Design
    → Per-flow analysis → Consolidated design package
    (You approve the complete design package once)
AI: /camel-plan → One implementation plan
    (Auto-proceeds)
AI: /camel-execute → Implement all tasks in dependency waves
    → internal camel-verify → Evidence embedded in execution-report.md
AI: /camel-validate → Static quality report

Migration package complete; any skipped or failed checks remain in the reports.
```

<!--tab Iterative-->

```
You: I need a REST API that writes to a database

AI: /camel-brainstorm → Interview → Design Spec

You: Actually, add caching before the database

AI: (Revises design spec)

You: Approved

AI: /camel-plan → /camel-execute → /camel-validate
```

<!--tab Troubleshooting-->

```
You: A previously working route now fails to build

AI: /camel-debug
    → Classifies as build error
    → Fixes POM dependency
    → Retries build
    → Build succeeds
    → Reports the verified fix and a recurrence guard
```

{{< /tabs >}}

## Ship Workflow: `/camel-ship`

`/camel-ship` is a thin delegate: it forwards your options to the registered `camel-kit ship` (or `camel kit ship`) command once. The local controller — not the AI agent — owns the run's stages, state, oversight, evidence, and publication:

```bash
# Smart oversight (default) — pauses after plan and execute
camel-kit ship --document requirements.md

# Minimal pauses — records reasonable defaults
camel-kit ship --document requirements.md --ask never

# Resume an interrupted run
camel-kit ship --resume <run-id>
```

Three oversight policies control where the controller pauses:

| Policy | Behavior |
|--------|----------|
| `always` | Pause for approval after design, plan, execute, and validate — including before publication |
| `smart` | Pause after plan and execute, and on material ambiguity |
| `never` | Record reasonable defaults instead of pausing, but still stop on missing tools, failed mandatory checks, or actions requiring authority you did not grant |

See [Ship Workflow](./ship/) for the full documentation.

## What's Next

Dive into each stage:

- [/camel-brainstorm](./brainstorm/) — Stage 1: Design interview
- [/camel-plan](./plan/) — Stage 2: Task decomposition
- [/camel-execute](./execute/) — Stage 3: Code generation
- [Runtime Verification](./verify/) — Internal build/test feedback loop
- [/camel-validate](./validate/) — Stage 4: Static quality analysis
- [Ship Workflow](./ship/) — Controller-owned run from requirements to published code
