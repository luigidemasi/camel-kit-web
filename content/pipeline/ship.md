---
title: "Autonomous Pipeline"
weight: 5
description: "/camel-ship — End-to-end pipeline with configurable oversight"
---

## Overview

`/camel-ship` is the autonomous pipeline orchestrator that chains all four stages (brainstorm, plan, execute, validate) in a single command with configurable human oversight. Execute includes internal runtime verification before validation. Instead of manually invoking each stage, you set an oversight level and let the pipeline run.

The result is a fully generated, verified integration — from requirements to working code — with exactly the level of human involvement you choose.

## When to Use

Invoke `/camel-ship` when you:

- Have requirements and want everything generated end-to-end
- Want autonomous execution with configurable checkpoints
- Need to resume an interrupted pipeline run
- Want to skip phases whose artifacts already exist

**Manual alternative:** If you prefer step-by-step control, enter through `/camel-start` or invoke a known stage directly. The four-stage pipeline gives you control at each transition.

## Arguments

```
/camel-ship [input-file] [--ask always|smart|never] [--resume] [--start-from <stage>]
```

| Argument | Default | Description |
|---|---|---|
| `[input-file]` | none | Requirements document, design spec, or brainstorm notes |
| `--ask` | `smart` | Oversight level (see below) |
| `--resume` | `false` | Continue from last saved state |
| `--start-from` | none | Skip to: `brainstorm`, `plan`, `execute`, or `validate` |

## The Pipeline

`/camel-ship` executes four pipeline stages followed by a stamp gate, with oversight decisions after each stage:

{{< carousel id="ship-stages" >}}
<!--step Stage 0: Brainstorm-->
## Stage 0: Brainstorm

**Invokes:** `/camel-brainstorm`

The AI conducts the design interview (Socratic questioning about systems, data formats, processing, error handling). If an `[input-file]` is provided, it uses the file as context for the interview.

**Output:** `docs/camel-kit/<pipeline-id>/design-spec.md`

**Oversight behavior:**

| Level | When complete | When open questions |
|-------|--------------|-------------------|
| `always` | Pause for approval | Pause |
| `smart` | Auto-proceed | Pause for input |
| `never` | Auto-proceed | Auto-proceed (pick reasonable defaults) |

<!--step Stage 1: Plan-->
## Stage 1: Plan

**Invokes:** `/camel-plan`

The AI decomposes the approved design into implementation tasks with acceptance criteria, dependencies, and wave analysis for parallel execution.

**Output:** `docs/camel-kit/<pipeline-id>/implementation-plan.md`

**Oversight behavior:**

| Level | When complete | When gaps found |
|-------|--------------|----------------|
| `always` | Auto-proceed | Pause for input |
| `smart` | Auto-proceed | Pause for input |
| `never` | Auto-proceed | Auto-fill gaps |

The plan stage auto-proceeds for all oversight levels once the plan is complete. There is no separate plan approval gate — the design approval from Stage 0 is the single approval gate in the pipeline.

<!--step Stage 2: Execute-->
## Stage 2: Execute

**Invokes:** `/camel-execute`

Execution begins with an **environment probe** that validates the target environment (Java version, Maven availability, project structure, required dependencies) before dispatching implementers. This catches feasibility issues early, before any code generation begins.

The AI then implements each task from the plan: generates YAML routes, properties, Docker Compose, DataMapper files, and Citrus tests. Each task gets two-stage review (spec compliance + code quality).

**Output:** Complete Maven project with all artifacts

**Oversight behavior:**

| Level | When tests pass | When tests fail |
|-------|-----------------|----------------|
| `always` | Pause after execution and present the report | Pause |
| `smart` | Pause after execution and present the report | Pause for decision |
| `never` | Auto-proceed | Auto-fix (up to 3 rounds) |

This is the longest stage. Agent traits optimize it significantly — for example, Claude Code dispatches independent tasks in parallel via background agents.

<!--step Stage 3: Validate-->
## Stage 3: Validate

**Invokes:** `/camel-validate`

After execute's internal runtime verification passes, the AI runs static route validation for configuration, security, quality, anti-patterns, project norms, and constitution compliance.

**Output:** `docs/camel-kit/<pipeline-id>/validation-report.md`

**Oversight behavior:**

| Level | No Critical findings | Critical findings |
|-------|----------------------|-------------------|
| `always` | Pause and present the report | Pause |
| `smart` | Auto-proceed to stamp | Pause |
| `never` | Auto-proceed to stamp | Pause (blocker) |

Validation is read-only, so `smart` and `never` proceed when it has no Critical findings. All oversight levels stop on a Critical finding.

<!--step Stage 4: Stamp-->
## Stage 4: Stamp Gate

**Final quality check** before declaring success.

The stamp gate verifies:
- Build passes (`./mvnw verify`)
- No Iron Law violations in generated routes
- Constitution compliance (all 8 rules)
- No unexpected uncommitted files
- All acceptance criteria from the design spec are addressed

**If all checks pass:** reports "Pipeline complete. All checks passed."

**If any check fails:** Pauses regardless of `--ask` level. Stamp gate failures are always blockers.
{{< /carousel >}}

## Three Oversight Levels

The `--ask` flag controls how much the pipeline pauses for human input:

{{< tabs id="oversight-levels" >}}
<!--tab always — Full Control-->

**Best for:** First-time users, critical integrations, learning how the pipeline works.

The pipeline pauses at the design gate, after execution completes, and after validation. The plan stage auto-proceeds once complete.

```
Stage 0: Brainstorm → "Here's the design spec. Approve?"
  (You approve)
Stage 1: Plan → Plan complete → auto-proceed
Stage 2: Execute → "Execution complete. Here's the report. Continue?"
  (You approve)
Stage 3: Validate → "Here's the validation report."
  (You approve)
Stamp → Done!

Total approvals: 3 for a successful, unambiguous run
```

**When to use:** When you want the same control as the manual pipeline but with automatic skill invocation between phases.

<!--tab smart — Contextual (Default)-->

**Best for:** Experienced users, standard integrations, day-to-day use.

The pipeline auto-proceeds through a clear design and complete plan, then always pauses after execution because that stage writes code. Validation auto-proceeds when it has no Critical findings; ambiguity, execution failures, and Critical findings pause for human judgment.

```
Stage 0: Brainstorm → Design complete, no open questions → auto-proceed
Stage 1: Plan → Plan complete and consistent → auto-proceed
Stage 2: Execute → Verification passes → "Here's the execution report. Continue?"
  (You approve)
Stage 3: Validate → No Critical findings → auto-proceed
Stamp → Done!

Total approvals: 1 for a successful, unambiguous run
```

**When to use:** Most of the time. You stay in control of decisions that matter while the pipeline handles the routine transitions.

<!--tab never — Fully Autonomous-->

**Best for:** Batch generation, CI/CD integration, well-understood integration patterns.

The pipeline runs end-to-end without pausing on successful outcomes. It auto-fixes eligible execution failures for up to 3 rounds. Critical validation findings, exhausted fixes, and stamp-gate failures cause a pause.

```
Stage 0: Brainstorm → auto-proceed (pick defaults for open questions)
Stage 1: Plan → auto-proceed (fill gaps)
Stage 2: Execute → Task 3 tests fail → auto-fix round 1 → still failing
                   → auto-fix round 2 → tests pass → auto-proceed
Stage 3: Validate → all checks pass → auto-proceed
Stamp → report pipeline complete

Total approvals: 0 (unless blocker)
```

**When to use:** When you trust the pipeline and want hands-off generation.

{{< /tabs >}}

## Auto-Fix Loop

When a stage fails and the oversight level allows autonomous fixing, the pipeline enters an auto-fix loop:

{{< carousel id="auto-fix" >}}
<!--step Classification-->
## Step 1: Classify

Every finding is categorized:

| Category | Description | Examples |
|---|---|---|
| **Critical** | Prevents build/run | Compilation error, missing dependency, YAML parse error |
| **Important** | Violates rules | Iron Law violation, Constitution non-compliance, test failure |
| **Suggestion** | Improvement | Code quality, performance, style |

`--ask never` can auto-fix eligible execution failures. `always` and `smart` pause on execution failures, and every level pauses on Critical validation findings.

<!--step Fix Attempt-->
## Step 2: Fix

Based on the category:

- **Compilation error** — read the error, locate the source, fix syntax/types
- **Missing dependency** — add to pom.xml, re-run `./mvnw compile`
- **Iron Law violation** — re-verify via MCP catalog, correct the usage
- **Test failure** — read test output, identify the failed assertion, fix route or test

<!--step Re-Verify-->
## Step 3: Re-Verify

After fixing, re-run the specific check that failed:
- Build error: `./mvnw compile`
- Test failure: `./mvnw test`
- Iron Law: re-scan the YAML file

If the check passes, the finding is resolved. If not, loop back.

<!--step Escalate-->
## Step 4: Escalate (after 3 rounds)

After 3 failed fix attempts for the same finding, the pipeline **always** pauses — regardless of `--ask` level:

```
Auto-fix exhausted (3 rounds) for: test failure in order-validation

Attempted:
  Round 1: Fixed route predicate → still failing
  Round 2: Fixed test assertion → still failing  
  Round 3: Regenerated route → still failing

Options: Fix manually / Skip this check / Abort pipeline
```

Three failed auto-fixes is always a blocker. The user always has final say.
{{< /carousel >}}

## State Persistence & Resume

Pipeline state is saved to `.camel-kit/pipeline.json` after each stage:

```json
{
  "activePipeline": "001-order-processing",
  "mode": "ship",
  "started": "2026-04-30T14:32:00Z",
  "ask": "smart",
  "currentStage": 2,
  "stageResults": {
    "0": { "status": "completed", "artifact": "docs/camel-kit/001-order-processing/design-spec.md" },
    "1": { "status": "completed", "artifact": "docs/camel-kit/001-order-processing/implementation-plan.md" },
    "2": { "status": "in_progress", "tasksCompleted": 3, "totalTasks": 5 }
  }
}
```

### Resume an interrupted pipeline

If the pipeline is interrupted (session closes, network failure), resume from where it stopped:

```
/camel-ship --resume
```

The pipeline reads the state file, runs `camel-kit doc check` on each pipeline artifact, and continues from `currentStage` only when the artifacts are fresh. If an artifact is stale, it restarts from the earliest affected stage and regenerates downstream outputs.

### Skip to a specific stage

If you already have artifacts from earlier stages:

```
# I already have a design spec, start from planning
/camel-ship --start-from plan

# I have design + plan, start execution
/camel-ship --start-from execute
```

`--start-from` verifies that prerequisite artifacts exist before proceeding.

## Agent-Specific Optimization

`/camel-ship` runs differently on each AI agent, thanks to agent traits. The pipeline goals are identical — the execution strategy adapts to each agent's strengths:

{{< tabs id="agent-traits" >}}
<!--tab Claude Code-->

- **Worktree isolation:** `EnterWorktree` at pipeline start isolates all generated artifacts
- **Parallel dispatch:** Independent tasks run as background agents via `run_in_background`
- **Build monitoring:** `CronCreate` schedules periodic `./mvnw compile` during execution
- **Smart pacing:** `ScheduleWakeup` avoids busy-polling between stages
- **Structured oversight:** `AskUserQuestion` with multiple-choice options at pause points

<!--tab Gemini CLI-->

- **Named agent chain:** Delegates to pre-registered `camel-implementer` and `camel-validator` agents
- **Execution limits:** `max_turns` and `timeout_mins` per subagent prevent runaway execution
- **Batch loading:** `read_many_files` loads all artifacts from previous stages in one call
- **State persistence:** `save_memory` provides backup state alongside the JSON file

<!--tab IBM Bob 2-->

- **Native subagents:** `spawn_subagent` uses `explore` for research/review and `general` for implementation, testing, and fixes
- **Parallel waves:** Independent tasks are spawned in the same parent turn after `camel-kit plan analyze`
- **Clean context:** `fork_context` is enabled only when a task needs earlier conversation decisions
- **Mode restrictions:** Bob custom modes still constrain tools while shared skills define pipeline behavior

<!--tab IBM Bob 1 (legacy)-->

- **Mode-based pipeline:** `switch_mode` transitions between brainstorm, plan, implement, and validate custom modes
- **Gate-based oversight:** Existing gate files (`.bob/gates/`) map directly to oversight levels — gates ARE the oversight mechanism
- **Precise insertion:** `insert_content` for additive code changes that preserve existing content

<!--tab Qwen Code-->

- **Serial execution:** Acknowledges Qwen's serial `task` dispatch — all tasks run sequentially
- **Visual progress:** `todo_write` maintains a visible checklist of pipeline stages
- **Explicit checkpoints:** State saved between every stage for reliable resume

<!--tab OpenCode-->

- **Step-limited stages:** `steps` limits per stage prevent runaway execution (200 for brainstorm, 500 for execute)
- **Agent type mapping:** `Plan` agent for brainstorm, `Build` agent for execute, and `General` for validation
{{< /tabs >}}

## Usage Examples

{{< tabs id="usage-examples" >}}
<!--tab Standard-->

```
# Default: smart oversight, full pipeline
/camel-ship requirements.md

→ Stage 0: Brainstorm (auto-proceeds — design complete)
→ Stage 1: Plan (auto-proceeds — plan consistent)
→ Stage 2: Execute (verification passes, presents report)
  You: "Continue"
→ Stage 3: Validate (no Critical findings, auto-proceeds)
→ Stamp: All gates pass

Pipeline complete. All checks passed.
```

<!--tab Fully Autonomous-->

```
# Fully autonomous
/camel-ship requirements.md --ask never

→ Runs all 4 stages autonomously
→ Auto-fixes any issues (up to 3 rounds each)
→ Reports the final stamp-gate result
```

<!--tab Resume after interruption-->

```
# Session interrupted during execution

/camel-ship --resume

Reading pipeline state from .camel-kit/pipeline.json...
  Stage 0 (Brainstorm): completed
  Stage 1 (Plan): completed
  Stage 2 (Execute): in_progress (3/5 tasks done)

Resuming from Stage 2, task 4...
```

<!--tab Skip brainstorming-->

```
# Already have a design spec
/camel-ship --start-from plan --ask always

Verifying prerequisites...
  docs/camel-kit/001-order-processing/design-spec.md: found

Starting from Stage 1 (Plan)...
```

{{< /tabs >}}

## Comparison: `/camel-ship` vs Manual Pipeline

| Aspect | Manual Pipeline | `/camel-ship --ask smart` | `/camel-ship --ask never` |
|--------|----------------|--------------------------|--------------------------|
| **Entry point** | `/camel-start` or a known stage | `/camel-ship` | `/camel-ship` |
| **Stage transitions** | Manual invocation | Automatic | Automatic |
| **Approval gates** | Chosen by the user | After execution, plus ambiguity or blockers | Only on blockers |
| **Auto-fix** | No | No | Eligible execution failures, up to 3 rounds |
| **Resume** | No | Yes (`--resume`) | Yes (`--resume`) |
| **Best for** | Learning, exploration | Day-to-day use | Batch generation, CI/CD |

## What's Next

- [/camel-brainstorm](../brainstorm/) — Phase 1: Design interview (what `/camel-ship` invokes first)
- [Runtime Verification](../verify/) — Internal feedback loop within execute
- `/camel-validate` — Final static quality stage
- [Skills System](../../architecture/skills/) — How traits customize the pipeline per agent
- [Command Reference](../../reference/commands/) — Full argument list
