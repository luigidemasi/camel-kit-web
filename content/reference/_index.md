---
title: "Reference"
weight: 5
description: "Command reference and project rules"
---

This section provides reference documentation for Camel-Kit commands and project rules.

## Command Reference

See [Commands](commands) for the full reference. Summary of available commands:

**Pipeline:**
- `/camel-brainstorm` — Phase 1: Design interview → Design Specification
- `/camel-plan` — Phase 2: Task decomposition → Implementation Plan
- `/camel-execute` — Phase 3: Orchestrated code generation with two-stage review
- `/camel-validate` — Phase 4: Static route quality analysis

**Entry points:**
- `/camel-start` — Route any integration request to the right skill
- `/camel-migrate` — Migration-specific discovery and design

**Autonomous:**
- `/camel-ship` — Autonomous pipeline (brainstorm → plan → execute → validate in one command)

**Standalone:**
- `/camel-knowledge` — Apache Camel documentation queries via MCP
- `/camel-debug` — Ad-hoc troubleshooting for broken routes

**CLI:**
- `camel-kit init` — Initialize a new project
- `camel-kit doctor` — Validate a generated workspace
- `camel-kit doc` — Track pipeline artifact provenance and staleness
- `camel-kit graph` — Property graph queries (15 subcommands)
- `camel-kit plan analyze` — Wave analysis for parallel execution

## Constitution (8 Rules)

Every generated route must comply with 8 architecture rules:

1. **Route Structure** — every route has a source (`from:`) and a sink (final `to:`)
2. **Single Responsibility** — one route = one purpose
3. **Separation of Concerns** — business logic in beans, integration logic in routes
4. **Naming Conventions** — route IDs: `kebab-case`, beans: `camelCase`
5. **Observability** — every route declares `routeId` and `description`
6. **External Configuration** — no hardcoded values, use `{{placeholder}}` syntax
7. **Component Verification** — every component verified via MCP catalog
8. **Infrastructure via Forage** — use catalog-verified `forage.*` properties before component scalars or hand-wired beans

## Iron Laws (6 Rules)

Non-negotiable rules enforced across all pipeline phases:

1. **MCP Catalog Verification** — every component verified before use
2. **Constitution Compliance** — every route passes all 8 rules
3. **No Code Without Plan & Design Approval** — no implementation before an approved design and task-based plan
4. **Spec Compliance Before Quality** — spec review first, then code quality review
5. **Adversarial Code Review** — fresh-context critics review generated code before staged review
6. **Surgical Changes** — touch only what the approved task requires

## Next Steps

- [Commands](commands) — Full command reference with examples
- [Architecture](../architecture) — 4-layer architecture deep dive
- [Getting Started](../getting-started) — Installation and first project
