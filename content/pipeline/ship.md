---
title: "Autonomous Pipeline"
weight: 5
description: "/camel-ship — End-to-end pipeline with configurable oversight"
---

## Overview

`/camel-ship` is the autonomous pipeline orchestrator that chains all four phases (brainstorm, plan, execute, verify) in a single command with configurable human oversight. Instead of manually invoking each phase and approving transitions, you set an oversight level and let the pipeline run.

The result is a fully generated, verified integration — from requirements to working code — with exactly the level of human involvement you choose.

## When to Use

Invoke `/camel-ship` when you:

- Have requirements and want everything generated end-to-end
- Want autonomous execution with configurable checkpoints
- Need to resume an interrupted pipeline run
- Want to skip phases whose artifacts already exist

**Manual alternative:** If you prefer step-by-step control, use `/camel-brainstorm` directly. The three-phase pipeline with explicit approval gates gives you full control at every transition.

## Arguments

```
/camel-ship [input-file] [--ask always|smart|never] [--resume] [--start-from <stage>] [--create-pr]
```

| Argument | Default | Description |
|---|---|---|
| `[input-file]` | none | Requirements document, design spec, or brainstorm notes |
| `--ask` | `smart` | Oversight level (see below) |
| `--resume` | `false` | Continue from last saved state |
| `--start-from` | none | Skip to: `brainstorm`, `plan`, `execute`, or `verify` |
| `--create-pr` | `false` | Auto-create a GitHub PR on successful completion |

## The Pipeline

`/camel-ship` executes five stages in sequence, with oversight decisions at each transition:

{{< carousel id="ship-stages" >}}
<!--step Stage 0: Brainstorm-->
## Stage 0: Brainstorm

**Invokes:** `/camel-brainstorm`

The AI conducts the design interview (Socratic questioning about systems, data formats, processing, error handling). If an `[input-file]` is provided, it uses the file as context for the interview.

**Output:** `docs/design-spec.md`

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

**Output:** `docs/implementation-plan.md`

**Oversight behavior:**

| Level | When complete | When gaps found |
|-------|--------------|----------------|
| `always` | Pause for approval | Pause |
| `smart` | Auto-proceed | Pause for input |
| `never` | Auto-proceed | Auto-fill gaps |

<!--step Stage 2: Execute-->
## Stage 2: Execute

**Invokes:** `/camel-execute`

The AI implements each task from the plan: generates YAML routes, properties, Docker Compose, DataMapper files, and Citrus tests. Each task gets two-stage review (spec compliance + code quality).

**Output:** Complete Maven project with all artifacts

**Oversight behavior:**

| Level | When tests pass | When tests fail |
|-------|-----------------|----------------|
| `always` | Pause after each task | Pause |
| `smart` | Auto-proceed | Pause for decision |
| `never` | Auto-proceed | Auto-fix (up to 3 rounds) |

This is the longest stage. Agent traits optimize it significantly — for example, Claude Code dispatches independent tasks in parallel via background agents.

<!--step Stage 3: Verify-->
## Stage 3: Verify

**Invokes:** `/camel-verify`

The AI runs the 5-phase verification loop: environment setup, build, start, behavioral testing, report generation.

**Output:** `docs/verification-report.md`

**Oversight behavior:**

| Level | When all checks pass | When checks fail |
|-------|---------------------|-----------------|
| `always` | Pause (present report) | Pause |
| `smart` | Pause (present report) | Pause |
| `never` | Auto-proceed to stamp | Auto-fix (up to 3 rounds) |

Both `always` and `smart` pause after verification to present the report — you always see what was generated before the pipeline declares success.

<!--step Stage 4: Stamp-->
## Stage 4: Stamp Gate

**Final quality check** before declaring success.

The stamp gate verifies:
- Build passes (`mvn verify`)
- No Iron Law violations in generated routes
- Constitution compliance (all 7 rules)
- No unexpected uncommitted files
- All acceptance criteria from the design spec are addressed

**If all checks pass:**
- With `--create-pr`: creates a GitHub PR with a summary
- Without: reports "Pipeline complete. All checks passed."

**If any check fails:** Pauses regardless of `--ask` level. Stamp gate failures are always blockers.
{{< /carousel >}}

## Three Oversight Levels

The `--ask` flag controls how much the pipeline pauses for human input:

{{< tabs id="oversight-levels" >}}
<!--tab always — Full Control-->

**Best for:** First-time users, critical integrations, learning how the pipeline works.

The pipeline pauses after every stage for explicit approval. You see every artifact before the next stage begins.

```
Stage 0: Brainstorm → "Here's the design spec. Approve?"
  (You approve)
Stage 1: Plan → "Here's the task breakdown. Approve?"
  (You approve)
Stage 2: Execute → "Task 1 complete. Continue?"
  (You approve each task)
Stage 3: Verify → "Here's the verification report."
  (You approve)
Stamp → Done!

Total approvals: 4+ (depends on task count)
```

**When to use:** When you want the same control as the manual pipeline but with automatic skill invocation between phases.

<!--tab smart — Contextual (Default)-->

**Best for:** Experienced users, standard integrations, day-to-day use.

The pipeline auto-proceeds when outcomes are clear (design spec is complete, tests pass) but pauses when something needs human judgment (open questions, test failures, ambiguous findings).

```
Stage 0: Brainstorm → Design complete, no open questions → auto-proceed
Stage 1: Plan → Plan complete and consistent → auto-proceed
Stage 2: Execute → Task 1 tests pass → auto-proceed
                   Task 3 tests fail → "Tests failing. Auto-fix / Manual fix / Skip?"
Stage 3: Verify → "Here's the verification report."
  (You review)
Stamp → Done!

Total approvals: 1-3 (depends on issues found)
```

**When to use:** Most of the time. You stay in control of decisions that matter while the pipeline handles the routine transitions.

<!--tab never — Fully Autonomous-->

**Best for:** Batch generation, CI/CD integration, well-understood integration patterns.

The pipeline runs end-to-end without pausing. When issues arise, it auto-fixes up to 3 rounds. Only blocker-level failures (3 failed auto-fix rounds, stamp gate failure) cause a pause.

```
Stage 0: Brainstorm → auto-proceed (pick defaults for open questions)
Stage 1: Plan → auto-proceed (fill gaps)
Stage 2: Execute → Task 3 tests fail → auto-fix round 1 → still failing
                   → auto-fix round 2 → tests pass → auto-proceed
Stage 3: Verify → all checks pass → auto-proceed
Stamp → auto-create PR

Total approvals: 0 (unless blocker)
```

**When to use:** When you trust the pipeline and want hands-off generation. Combine with `--create-pr` to get a reviewable PR at the end.

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

`--ask smart` auto-fixes Critical and Important, pauses on Suggestion.
`--ask never` auto-fixes all categories.

<!--step Fix Attempt-->
## Step 2: Fix

Based on the category:

- **Compilation error** — read the error, locate the source, fix syntax/types
- **Missing dependency** — add to pom.xml, re-run `mvn compile`
- **Iron Law violation** — re-verify via MCP catalog, correct the usage
- **Test failure** — read test output, identify the failed assertion, fix route or test

<!--step Re-Verify-->
## Step 3: Re-Verify

After fixing, re-run the specific check that failed:
- Build error: `mvn compile`
- Test failure: `mvn test`
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

Pipeline state is saved to `.camel-kit/ship-state.json` after each stage:

```json
{
  "started": "2026-04-30T14:32:00Z",
  "ask": "smart",
  "currentStage": 2,
  "stageResults": {
    "0": { "status": "completed", "artifact": "docs/design-spec.md" },
    "1": { "status": "completed", "artifact": "docs/implementation-plan.md" },
    "2": { "status": "in_progress", "tasksCompleted": 3, "totalTasks": 5 }
  }
}
```

### Resume an interrupted pipeline

If the pipeline is interrupted (session closes, network failure), resume from where it stopped:

```
/camel-ship --resume
```

The pipeline reads the state file and continues from `currentStage`.

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
- **Build monitoring:** `CronCreate` schedules periodic `mvn compile` during execution
- **Smart pacing:** `ScheduleWakeup` avoids busy-polling between stages
- **Structured oversight:** `AskUserQuestion` with multiple-choice options at pause points

<!--tab Gemini CLI-->

- **Named agent chain:** Delegates to pre-registered `camel-implementer` and `camel-validator` agents
- **Execution limits:** `max_turns` and `timeout_mins` per subagent prevent runaway execution
- **Batch loading:** `read_many_files` loads all artifacts from previous stages in one call
- **State persistence:** `save_memory` provides backup state alongside the JSON file

<!--tab IBM Bob-->

- **Mode-based pipeline:** `switch_mode` transitions between brainstorm, plan, implement, and validate custom modes
- **Gate-based oversight:** Existing gate files (`.bob/gates/`) map directly to oversight levels — gates ARE the oversight mechanism
- **Precise insertion:** `insert_content` for additive code changes that preserve existing content

<!--tab Qwen Code-->

- **Serial execution:** Acknowledges Qwen's serial `task` dispatch — all tasks run sequentially
- **Visual progress:** `todo_write` maintains a visible checklist of pipeline stages
- **Explicit checkpoints:** State saved between every stage for reliable resume

<!--tab OpenCode-->

- **Step-limited stages:** `steps` limits per stage prevent runaway execution (200 for brainstorm, 500 for execute)
- **Agent type mapping:** `Plan` agent for brainstorm, `Build` agent for execute, `General` for verify
{{< /tabs >}}

## Usage Examples

{{< tabs id="usage-examples" >}}
<!--tab Standard-->

```
# Default: smart oversight, full pipeline
/camel-ship requirements.md

→ Stage 0: Brainstorm (auto-proceeds — design complete)
→ Stage 1: Plan (auto-proceeds — plan consistent)
→ Stage 2: Execute (pauses on test failure in task 3)
  You: "Auto-fix"
→ Stage 2: Execute (auto-fix succeeds, continues)
→ Stage 3: Verify (presents report)
  You: "Looks good"
→ Stamp: All gates pass

Pipeline complete. All checks passed.
```

<!--tab Autonomous with PR-->

```
# Fully autonomous, create PR at the end
/camel-ship requirements.md --ask never --create-pr

→ Runs all 4 stages autonomously
→ Auto-fixes any issues (up to 3 rounds each)
→ Creates GitHub PR with summary

Created PR #42: "Add order processing integration"
```

<!--tab Resume after interruption-->

```
# Session interrupted during execution

/camel-ship --resume

Reading pipeline state from .camel-kit/ship-state.json...
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
  docs/design-spec.md: found

Starting from Stage 1 (Plan)...
```

{{< /tabs >}}

## Comparison: `/camel-ship` vs Manual Pipeline

| Aspect | Manual Pipeline | `/camel-ship --ask smart` | `/camel-ship --ask never` |
|--------|----------------|--------------------------|--------------------------|
| **Entry point** | `/camel-brainstorm` | `/camel-ship` | `/camel-ship` |
| **Phase transitions** | Manual invocation | Automatic | Automatic |
| **Approval gates** | Every phase | Only on ambiguity | Only on blockers |
| **Auto-fix** | No | On failures | On everything |
| **Resume** | No | Yes (`--resume`) | Yes (`--resume`) |
| **PR creation** | Manual | Optional (`--create-pr`) | Optional (`--create-pr`) |
| **Best for** | Learning, exploration | Day-to-day use | Batch generation, CI/CD |

## What's Next

- [/camel-brainstorm](../brainstorm/) — Phase 1: Design interview (what `/camel-ship` invokes first)
- [/camel-verify](../verify/) — Runtime verification (what `/camel-ship` invokes last)
- [Skills System](../../architecture/skills/) — How traits customize the pipeline per agent
- [Command Reference](../../reference/commands/) — Full argument list
