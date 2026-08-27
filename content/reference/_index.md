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
- `/camel-execute` — Phase 3: Orchestrated code generation with an adversarial pre-filter followed by spec-compliance and code-quality review
- `/camel-validate` — Phase 4: Static route quality analysis

**Entry points:**
- `/camel-start` — Route any integration request to the right skill
- `/camel-migrate` — Migration-specific discovery and design

**Ship:**
- `/camel-ship` — Thin wrapper around the local `camel-kit ship` workflow controller (discovery → design → plan → execute → validate)

**Standalone:**
- `/camel-knowledge` — Apache Camel documentation queries via MCP
- `/camel-debug` — Ad-hoc troubleshooting for broken routes

**CLI:**

The `camel kit` forms below require a plugin built from the current `0.3.2-SNAPSHOT` source. Published stable `0.3.1` exposes only `camel kit init`.

- `camel-kit init` — Initialize a new project
- `camel-kit ship` — Start, inspect, resume, or abort a local Camel Ship run
- `camel-kit doctor` — Validate a generated workspace
- `camel-kit doc` / `camel kit doc` — Track pipeline artifact provenance and staleness
- `camel-kit nextId` / `camel kit nextId` — Create the next numbered pipeline directory
- `camel-kit graph` — Property graph queries (15 subcommands)
- `camel-kit plan analyze` — Wave analysis for parallel execution

## Constitution (8 Rules)

Every generated route must comply with 8 architecture rules:

1. **Route Structure** — every route has a source (`from:`) and a sink (final `to:`)
2. **Single Responsibility** — one route = one purpose
3. **Separation of Concerns** — business logic in beans, integration logic in routes
4. **Naming Conventions** — route IDs use `<domain>-<action>[-<qualifier>]`, internal endpoints use `direct:<route-id>` or `seda:<domain>-<purpose>`, and custom headers use `kebab-case`
5. **Observability** — every route declares `routeId` and `description`
6. **External Configuration** — no hardcoded connection strings, credentials, or environment-specific values; use `{{placeholder}}` syntax
7. **Component Verification** — every component verified via MCP catalog
8. **Infrastructure via Forage** — use catalog-verified `forage.*` properties before component scalars or hand-wired beans

## Iron Laws (6 Rules)

Non-negotiable rules enforced across all pipeline phases:

1. **MCP Catalog Verification** — every component, EIP, data format, and expression language is verified before use; `forage.*` keys use the cached Forage catalog instead
2. **Constitution Compliance** — every route passes all 8 rules
3. **No Code Without Design Approval and an Existing Plan** — no implementation before an approved design and task-based plan
4. **Spec Compliance Before Quality** — spec review first, then code quality review
5. **Adversarial Code Review** — fresh-context critics where supported, or a same-session fallback on single-conversation targets such as Bob 1 and Pi, review generated code before staged review
6. **Surgical Changes** — touch only what the approved task requires

## Next Steps

- [Commands](commands) — Full command reference with examples
- [Architecture](../architecture) — 4-layer architecture deep dive
- [Getting Started](../getting-started) — Installation and first project
