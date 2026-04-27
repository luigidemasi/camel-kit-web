---
title: "Reference"
weight: 5
description: "Command reference and project rules"
---

This section provides reference documentation for Camel-Kit commands and project rules.

## Command Reference

See [Commands](commands) for the full reference. Summary of available commands:

**Pipeline (3-phase flow):**
- `/camel-brainstorm` — Phase 1: Design interview → Design Specification
- `/camel-plan` — Phase 2: Task decomposition → Implementation Plan
- `/camel-execute` — Phase 3: Orchestrated code generation with two-stage review

**Entry points:**
- `/camel-flow` — Greenfield shortcut into brainstorm
- `/camel-migrate` — Migration shortcut into brainstorm

**Standalone:**
- `/camel-verify` — Runtime verification loop (build → start → test → fix)
- `/camel-validate` — Route validation against catalog and constitution
- `/camel-knowledge` — Apache Camel documentation queries via MCP

**CLI:**
- `camel-kit init` — Initialize a new project
- `camel-kit graph` — Property graph queries (14 subcommands)
- `camel-kit plan analyze` — Wave analysis for parallel execution

## Constitution (7 Rules)

Every generated route must comply with 7 architecture rules:

1. **Route Structure** — every route has a source (`from:`) and a sink (final `to:`)
2. **Single Responsibility** — one route = one purpose
3. **Separation of Concerns** — business logic in beans, integration logic in routes
4. **Naming Conventions** — route IDs: `kebab-case`, beans: `camelCase`
5. **Observability** — every route declares `routeId` and `description`
6. **External Configuration** — no hardcoded values, use `{{placeholder}}` syntax
7. **Component Verification** — every component verified via MCP catalog

## Iron Laws (4 Rules)

Non-negotiable rules enforced across all pipeline phases:

1. **MCP Catalog Verification** — every component verified before use
2. **Constitution Compliance** — every route passes all 7 rules
3. **No Code Without Spec Approval** — no implementation before approved design
4. **Spec Compliance Before Quality** — spec review first, then code quality review

## Next Steps

- [Commands](commands) — Full command reference with examples
- [Architecture](../architecture) — 4-layer architecture deep dive
- [Getting Started](../getting-started) — Installation and first project
