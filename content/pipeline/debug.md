---
title: "Route Debugging"
weight: 8
description: "/camel-debug — structured troubleshooting outside a pipeline run"
toc: false
---

## Overview

`/camel-debug` diagnoses and fixes a broken Camel route through a strict **STOP → PRESERVE → DIAGNOSE → FIX → GUARD** workflow.

Use it for startup failures, runtime exceptions, unexpected behavior, or routes that previously worked. Build and test failures encountered during `/camel-execute` stay in that pipeline's internal verification loop.

## Five Steps

1. **STOP** — read the project runtime and Camel version, capture the exact symptom, and make no changes.
2. **PRESERVE** — record the branch, working-tree state, and existing local changes.
3. **DIAGNOSE** — reproduce the failure, classify it against the error taxonomy, verify affected components through Camel MCP, and inspect route structure.
4. **FIX** — make one targeted repair for the diagnosed root cause, then rerun the reproduction command.
5. **GUARD** — suggest a test, validation check, health check, or other preventive measure; do not add it without approval.

Diagnosis uses isolated subagents where the selected AI target supports them, keeping verbose logs and exploratory output out of the main conversation. If the error cannot be reproduced or classified, the skill reports that uncertainty instead of guessing.

## Result

The final summary records the original symptom, root cause, classification, verified fix, changed files, and recommended recurrence guard.
