---
title: "Skill Router"
weight: 0
description: "/camel-start — route integration work to the right Camel-Kit skill"
toc: false
---

## Overview

`/camel-start` is Camel-Kit's single entry point. It examines the request and loads only the pipeline stage or utility needed for that work.

## Routing Decision

The first matching row wins:

| Request state | Route |
|---------------|-------|
| Existing MuleSoft, BizTalk, Fuse, or Camel 2.x/3.x code | `/camel-migrate` |
| Approved design ready for task decomposition | `/camel-plan` |
| Approved implementation plan ready to build | `/camel-execute` |
| Generated routes need static quality validation | `/camel-validate` |
| A route is broken outside a pipeline run | `/camel-debug` |
| New integration, new feature, or unclear request | `/camel-brainstorm` |

This lets an existing project enter midway through the pipeline without repeating completed work.

## Pipelines

```text
Greenfield: /camel-brainstorm → /camel-plan → /camel-execute → /camel-validate
Migration:  /camel-migrate    → /camel-plan → /camel-execute → /camel-validate
```

Runtime verification is handled internally by `camel-verify` during execution. `/camel-ship` can run the full pipeline with configurable oversight, while `/camel-knowledge` answers Camel documentation questions without changing pipeline state.

## When to Invoke a Skill Directly

Use a specific command when the destination is already known—for example, `/camel-plan` with an approved design or `/camel-debug` for a broken route. Use `/camel-start` when the request is new or its current stage is uncertain.
