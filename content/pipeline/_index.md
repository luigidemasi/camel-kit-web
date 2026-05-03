---
title: "Pipeline"
weight: 2
description: "The design-to-code pipeline — manual or autonomous"
toc: false
---

## Overview

The Camel-Kit pipeline transforms integration requirements into working code through an orchestrated workflow. You can run it two ways:

- **Manual (3-phase):** Invoke `/camel-brainstorm` and approve each phase transition. Full control at every step.
- **Autonomous (`/camel-ship`):** Run the entire pipeline in one command with configurable oversight — from `--ask always` (approve everything) to `--ask never` (fully autonomous).

Both modes execute the same phases and enforce the same Iron Laws.

## The Three Phases

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

**Auto-invokes:** `/camel-verify` for runtime validation
{{< /carousel >}}

## Approval Gate

The design phase has an approval gate. After `/camel-brainstorm` completes, the AI presents the **Design Specification** with 7 sections (business purpose, flows, endpoints, data formats, error handling, technical requirements, observability).

You must explicitly approve before the pipeline continues. You can request changes — the AI revises and re-presents.

After design approval, planning and execution auto-proceed without additional approval gates. `/camel-plan` generates the task breakdown and automatically transitions to `/camel-execute`. `/camel-verify` then runs automatically after execution completes — it's non-destructive, building, starting, testing, and reporting. If it fails, the AI fixes and retries without asking.

## Iron Laws

Four non-negotiable rules enforced across all phases:

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

Every generated route must comply with the **Constitution's 7 rules:**

1. **Route Structure** — from → process → to
2. **Single Responsibility** — one route = one business capability
3. **Separation of Concerns** — no business logic in technical routes
4. **Naming Conventions** — kebab-case route IDs, camelCase beans
5. **Observability** — metrics, logging, tracing
6. **External Configuration** — no hardcoded values
7. **Supported Components** — only catalog-verified components

<!--tab 3. No Code Without Design Approval-->

The AI **cannot generate implementation code** until the Design Specification is explicitly approved. After design approval, planning and execution auto-proceed without additional gates. Prevents wasted effort — if the design is wrong, the implementation will be wrong.

`/camel-execute` checks for approved design spec before starting. If none found: *"Please run /camel-brainstorm first."*

<!--tab 4. Spec Before Quality-->

Every artifact must pass **spec compliance review before code quality review**. Two-stage review per task:

1. **Stage 1:** Does this match the spec's acceptance criteria?
2. **Stage 2:** Is this well-written? Does it follow the constitution?

If stage 1 fails, regenerate without running stage 2.

{{< /tabs >}}

## Internal Skills

Three skills are loaded by `/camel-execute` — not user-invocable:

{{< tabs id="internal-skills" >}}
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

<!--tab camel-validate-->

Validates component names against the MCP catalog and checks YAML syntax, constitution compliance, and security.

- **Input:** Route YAML file
- **Output:** Timestamped validation report
- **Loaded by:** `/camel-execute` during spec compliance review

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
AI: /camel-verify → Build → Test → Report

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
AI: /camel-verify → Verify migrated flow

Flow 1 complete! Ready for flow 2?
```

<!--tab Iterative-->

```
You: I need a REST API that writes to a database

AI: /camel-brainstorm → Interview → Design Spec

You: Actually, add caching before the database

AI: (Revises design spec)

You: Approved

AI: /camel-plan → /camel-execute → /camel-verify
```

<!--tab Troubleshooting-->

```
You: The build is failing with a dependency error

AI: /camel-verify
    → Classifies as build error
    → Fixes POM dependency
    → Retries build
    → Build succeeds
    → Continues to runtime tests...
```

{{< /tabs >}}

## Autonomous Mode: `/camel-ship`

For hands-off execution, `/camel-ship` chains all four phases with configurable oversight:

```bash
# Smart oversight (default) — pauses only on ambiguity
/camel-ship requirements.md

# Fully autonomous — pauses only on blockers, creates PR at the end
/camel-ship requirements.md --ask never --create-pr

# Resume interrupted pipeline
/camel-ship --resume
```

Three oversight levels control when the pipeline pauses:

| Level | Behavior |
|-------|----------|
| `always` | Pause for approval at every stage |
| `smart` | Auto-proceed when clear, pause on ambiguity |
| `never` | Fully autonomous — only stop on blockers |

See [/camel-ship](./ship/) for the full autonomous pipeline documentation.

## What's Next

Dive into each phase:

- [/camel-brainstorm](./brainstorm/) — Phase 1: Design interview
- [/camel-plan](./plan/) — Phase 2: Task decomposition
- [/camel-execute](./execute/) — Phase 3: Code generation
- [/camel-verify](./verify/) — Runtime verification loop
- [/camel-ship](./ship/) — Autonomous pipeline with configurable oversight
