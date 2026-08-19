---
title: "Pipeline"
weight: 2
description: "The design-to-code pipeline — manual stages, plus the controller-owned Ship workflow"
toc: false
---

## Overview

The Camel-Kit pipeline transforms integration requirements into working code through an orchestrated workflow. You can run it two ways:

- **Manual:** Enter through `/camel-start` or invoke a known stage directly. Full control at each transition.
- **Ship (`/camel-ship`):** Delegate to the local `camel-kit ship` controller, which runs its own workflow — discovery, design, plan, execute, validate — with configurable oversight (`--ask always|smart|never`).

The manual pipeline is agent-run and enforces the Iron Laws at each stage; Ship's stages, state, and gates are owned by the local controller.

## The Four Pipeline Stages

{{< carousel id="pipeline-phases" >}}
<!--step Phase 1: Design-->
## 💡 /camel-brainstorm

**Goal:** Transform vague integration ideas into formal Design Specifications

- Socratic questioning about your requirements
- MCP catalog verification of all components
- Generation of 7-section Design Specification

**Output:** Design Specification ready for approval

**Why this matters:** Most AI coding tools jump from prompt to code. This works for scripts but fails for complex integrations. Camel-Kit separates requirements gathering from implementation.

<!--step Phase 2: Plan-->
## 📋 /camel-plan

**Goal:** Break the design into executable tasks with dependencies

- Analyze design spec and identify distinct flows
- Create task breakdown with acceptance criteria
- Build dependency graph for wave analysis

**Output:** Implementation Plan with parallelizable task waves

**Why this matters:** Without decomposition, you get a giant blob of code. Tasks enable incremental validation and parallel execution.

<!--step Phase 3: Execute-->
## ⚙️ /camel-execute

**Goal:** Transform the plan into working, verified code

- Wave-based parallel task execution
- Two-stage review per task (spec compliance + code quality)
- Generation of routes, tests, and configuration

**Output:** Complete Maven project with verified artifacts

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

The design phase has an approval gate. After `/camel-brainstorm` completes, the AI presents the **Design Specification** with 7 sections (business purpose, flows, endpoints, data formats, error handling, technical requirements, observability).

You must explicitly approve before the pipeline continues. You can request changes — the AI revises and re-presents.

After design approval, planning and execution auto-proceed without additional approval gates. `/camel-plan` generates the task breakdown and transitions to `/camel-execute`; execute dispatches internal runtime verification, then continues to `/camel-validate` for static quality analysis.

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

1. **Route Structure** — from → process → to
2. **Single Responsibility** — one route = one business capability
3. **Separation of Concerns** — no business logic in technical routes
4. **Naming Conventions** — kebab-case route IDs, camelCase beans
5. **Observability** — metrics, logging, tracing
6. **External Configuration** — no hardcoded values
7. **Supported Components** — only catalog-verified components
8. **Infrastructure via Forage** — prefer catalog-verified `forage.*` configuration over hand-wired beans

<!--tab 3. No Code Without Design Approval-->

The AI **cannot generate implementation code** until the Design Specification is explicitly approved. After design approval, planning and execution auto-proceed without additional gates. Prevents wasted effort — if the design is wrong, the implementation will be wrong.

`/camel-execute` checks for approved design spec before starting. If none found: *"Please run /camel-brainstorm first."*

<!--tab 4. Spec Before Quality-->

Every artifact must pass **spec compliance review before code quality review**. Two-stage review per task:

1. **Stage 1:** Does this match the spec's acceptance criteria?
2. **Stage 2:** Is this well-written? Does it follow the constitution?

If stage 1 fails, regenerate without running stage 2.

<!--tab 5. Adversarial Review-->

Every generated code artifact passes a fresh-context adversarial review before spec compliance and quality review. Specialized critics look for route architecture, security, performance, boundary, and behavioral-equivalence failures.

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

Creates Citrus integration tests for behavioral verification with Testcontainers.

- **Input:** Route specification and test scenarios
- **Output:** Citrus Java test class
- **Loaded by:** `/camel-execute` during test generation tasks

<!--tab camel-verify-->

Builds, tests, diagnoses, and repairs the generated application in a runtime feedback loop.

- **Input:** Generated application and Citrus tests
- **Output:** Runtime verification report
- **Loaded by:** `/camel-execute` after implementation

{{< /tabs >}}

## Pipeline Patterns

{{< tabs id="pipeline-patterns" >}}
<!--tab Greenfield-->

```
You: I need to build an order processing integration

AI: /camel-brainstorm → Interview → Design Spec
    (You approve)
AI: /camel-plan → Task decomposition → Plan
    (Auto-proceeds)
AI: /camel-execute → Wave-based generation → Code
    → internal camel-verify → Build → Test → Report
AI: /camel-validate → Static quality report

Total: 1 command, 1 approval, 4 phases
```

<!--tab Migration-->

```
You: Migrate my MuleSoft/BizTalk flows to Camel

AI: /camel-migrate → Detect → Parse → Graph → Design
    (You approve flow 1 design)
AI: /camel-plan → Task decomposition
    (Auto-proceeds)
AI: /camel-execute → Generate migrated code
    → internal camel-verify → Verify migrated flow
AI: /camel-validate → Static quality report

Flow 1 complete! Ready for flow 2?
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
- `/camel-validate` — Stage 4: Static quality analysis
- [Ship Workflow](./ship/) — Controller-owned run from requirements to published code
