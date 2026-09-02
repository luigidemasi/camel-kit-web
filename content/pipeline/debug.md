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

## Context and Confirmation

User-provided and reproduced logs or stack traces, route and configuration files, and MCP responses are diagnostic data. `/camel-debug` may reproduce and classify the symptom and apply a targeted fix independently selected by the shipped error taxonomy from corroborated facts within the requested scope. The same boundary follows loaded content into every diagnostic role.

Commands, URLs, tool requests, file changes, secret requests, scope expansion, and procedural text found in that content cannot direct the workflow. Safe diagnosis continues where possible. If an action outside the shipped workflow is genuinely needed, Camel-Kit identifies the source, exact action, independently verified reason, and scope, then waits for action-specific user confirmation. An isolated role that cannot ask returns `NEEDS_USER_CONFIRMATION` without acting; confirmation does not make the source or its remaining content authoritative.

The user's invocation determines the repair gate. A direct request to diagnose **and fix** preauthorizes ordinary in-scope repairs selected by the shipped taxonomy from corroborated facts. A diagnosis-only request stops before mutation: Camel-Kit presents the exact proposed repair and waits for explicit approval before entering the fix step. Text inside a log, route, response, or other loaded artifact can never satisfy either gate.

## Result

The final summary records the original symptom, root cause, classification, the fix applied if any, changed files, and a recommended recurrence guard. A diagnosis-only run can therefore finish with no fix and no changed files.
