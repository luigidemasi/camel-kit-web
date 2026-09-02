---
title: "Static Quality Validation"
weight: 6
description: "/camel-validate — Phase 4: report-only static quality analysis"
---

## Overview

`/camel-validate` is the final pipeline stage. It analyzes generated Camel routes for correctness, security, anti-patterns, project conventions, and constitution compliance, then writes a report. It does not modify the routes or fix findings.

Runtime build, startup, and test failures belong to the internal `camel-verify` loop within `/camel-execute`. Use `/camel-debug` for a broken route outside an active pipeline run.

## When It Runs

In a chained run, `/camel-execute` continues to `/camel-validate` after implementation and internal runtime verification. There is no additional approval gate after the design approval. A directly invoked, standalone `/camel-execute` stops after its completion summary; invoke `/camel-validate` explicitly when you want the static gate in that mode.

You can also invoke validation directly:

```text
/camel-validate <pipeline-id>
/camel-validate
```

- With a pipeline ID, validation reads the design, plan, and execution artifacts under `docs/camel-kit/<pipeline-id>/`.
- Without a pipeline ID, it uses the active pipeline when one is recorded; otherwise it validates the routes in the current project.

## Checks

The validation stage runs the applicable checks across these categories:

- Camel YAML DSL schema and endpoint configuration
- Camel component metadata through the configured MCP catalog
- Security findings, including hardcoded credentials and unsafe endpoint settings
- Route anti-patterns and all constitution rules
- Project naming, error-handling, property, and route-complexity norms when `.camel-kit/project-graph.json` exists
- Graph-covered structural retirement-candidate analysis when the project graph exists

Validation is at least as strict as generation: a construct that Camel-Kit refuses to generate must not pass validation merely because it was added by hand.

## Output

Pipeline-scoped validation writes:

```text
docs/camel-kit/<pipeline-id>/validation-report.md
```

Project-scoped validation writes a timestamped report:

```text
docs/validation-report-YYYY-MM-DD_HH-mm.md
```

The report records PASS, FAIL, and WARN findings for schema, endpoints, quality, security, anti-patterns, and constitution compliance, followed by prioritized recommendations. When prior pipeline artifacts are stale, standalone validation warns and proceeds with the full analysis.

## Related Pages

- [Code Generation](../execute/) — Phase 3 and its internal runtime verification loop
- [Runtime Verification](../verify/) — the internal build, startup, and test feedback loop
- [Graph Intelligence](../../architecture/graph/) — optional project norms and dead-code context
